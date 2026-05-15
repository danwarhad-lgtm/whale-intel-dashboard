import { NextResponse } from "next/server";
import { binanceFundingAll } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_TTL = 60_000;

export async function GET() {
  const cached = cacheGet("funding");
  if (cached) return NextResponse.json(cached);
  const res = await binanceFundingAll();
  if (!res.ok || !Array.isArray(res.data)) {
    return NextResponse.json(envelope({ data: { items: [] }, status: "error", error: res.error }));
  }
  const items = res.data
    .filter((s) => s.symbol.endsWith("USDT"))
    .map((s) => ({
      symbol: s.symbol.replace("USDT", ""),
      pair: s.symbol,
      markPrice: parseFloat(s.markPrice),
      indexPrice: parseFloat(s.indexPrice),
      fundingRate: parseFloat(s.lastFundingRate),
      nextFundingTime: parseInt(s.nextFundingTime, 10),
    }))
    .filter((x) => Number.isFinite(x.markPrice) && x.markPrice > 0)
    .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
    .slice(0, 100);
  const env = envelope({ data: { items }, status: "live", provider: "binance-fapi" });
  cacheSet("funding", env, CACHE_TTL);
  return NextResponse.json(env);
}

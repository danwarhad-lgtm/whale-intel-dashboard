import { NextResponse } from "next/server";
import { hyperliquidMetaAndCtxs } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_TTL = 60_000;

export async function GET() {
  const cached = cacheGet("funding");
  if (cached) return NextResponse.json(cached);
  const res = await hyperliquidMetaAndCtxs();
  if (!res.ok || !Array.isArray(res.data) || res.data.length < 2) {
    return NextResponse.json(envelope({ data: { items: [] }, status: "error", error: res.error }));
  }
  const universe = res.data[0]?.universe ?? [];
  const ctxs = res.data[1] ?? [];
  const items = universe.map((u, i) => {
    const c = ctxs[i] ?? {};
    if (u.isDelisted) return null;
    const fundingRate = parseFloat(c.funding ?? 0);
    const markPrice = parseFloat(c.markPx ?? 0);
    if (!Number.isFinite(fundingRate) || !Number.isFinite(markPrice) || markPrice <= 0) return null;
    return {
      symbol: u.name,
      pair: `${u.name}-PERP`,
      markPrice,
      indexPrice: parseFloat(c.oraclePx ?? 0),
      fundingRate,
      // hyperliquid funding is hourly
      fundingIntervalHours: 1,
      premium: parseFloat(c.premium ?? 0),
      volume24h: parseFloat(c.dayBaseVlm ?? 0),
      turnover24h: parseFloat(c.dayNtlVlm ?? 0),
    };
  }).filter(Boolean)
    .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
    .slice(0, 100);
  const env = envelope({ data: { items }, status: "live", provider: "hyperliquid" });
  cacheSet("funding", env, CACHE_TTL);
  return NextResponse.json(env);
}

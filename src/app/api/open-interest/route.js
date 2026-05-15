import { NextResponse } from "next/server";
import { binanceOI, binanceFundingAll } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_TTL = 60_000;
const TOP = ["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","DOGEUSDT","BNBUSDT","ADAUSDT","AVAXUSDT","TRXUSDT","LINKUSDT","DOTUSDT","MATICUSDT","TONUSDT","SHIBUSDT","LTCUSDT","NEARUSDT","APTUSDT","SUIUSDT","ARBUSDT","OPUSDT"];

export async function GET() {
  const cached = cacheGet("oi");
  if (cached) return NextResponse.json(cached);
  const [fundingRes, ...oiRes] = await Promise.all([
    binanceFundingAll(),
    ...TOP.map((s) => binanceOI(s)),
  ]);
  const priceMap = {};
  if (fundingRes.ok && Array.isArray(fundingRes.data)) {
    for (const s of fundingRes.data) priceMap[s.symbol] = parseFloat(s.markPrice);
  }
  const items = oiRes.map((r, i) => {
    if (!r.ok) return null;
    const oi = parseFloat(r.data?.openInterest ?? 0);
    const price = priceMap[TOP[i]] ?? 0;
    return {
      symbol: TOP[i].replace("USDT", ""),
      pair: TOP[i],
      openInterest: oi,
      markPrice: price,
      notionalUsd: oi * price,
    };
  }).filter(Boolean).sort((a, b) => b.notionalUsd - a.notionalUsd);
  const total = items.reduce((acc, x) => acc + x.notionalUsd, 0);
  const env = envelope({ data: { items, totalNotional: total }, status: "live", provider: "binance-fapi" });
  cacheSet("oi", env, CACHE_TTL);
  return NextResponse.json(env);
}

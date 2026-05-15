import { NextResponse } from "next/server";
import { hyperliquidMetaAndCtxs } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_TTL = 60_000;

export async function GET() {
  const cached = cacheGet("oi");
  if (cached) return NextResponse.json(cached);
  const res = await hyperliquidMetaAndCtxs();
  if (!res.ok || !Array.isArray(res.data) || res.data.length < 2) {
    return NextResponse.json(envelope({ data: { items: [], totalNotional: 0 }, status: "error", error: res.error }));
  }
  const universe = res.data[0]?.universe ?? [];
  const ctxs = res.data[1] ?? [];
  const items = universe.map((u, i) => {
    const c = ctxs[i] ?? {};
    if (u.isDelisted) return null;
    const oi = parseFloat(c.openInterest ?? 0);
    const markPrice = parseFloat(c.markPx ?? 0);
    if (!Number.isFinite(oi) || !Number.isFinite(markPrice) || markPrice <= 0 || oi <= 0) return null;
    return {
      symbol: u.name,
      pair: `${u.name}-PERP`,
      openInterest: oi,
      markPrice,
      notionalUsd: oi * markPrice,
      volume24h: parseFloat(c.dayBaseVlm ?? 0),
      turnover24h: parseFloat(c.dayNtlVlm ?? 0),
    };
  }).filter(Boolean)
    .sort((a, b) => b.notionalUsd - a.notionalUsd)
    .slice(0, 30);
  const total = items.reduce((acc, x) => acc + x.notionalUsd, 0);
  const env = envelope({ data: { items, totalNotional: total }, status: "live", provider: "hyperliquid" });
  cacheSet("oi", env, CACHE_TTL);
  return NextResponse.json(env);
}

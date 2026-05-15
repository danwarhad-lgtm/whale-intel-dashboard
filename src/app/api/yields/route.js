import { NextResponse } from "next/server";
import { dllYieldPools } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_KEY = "yields";
const CACHE_TTL = 5 * 60_000;

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);
  const res = await dllYieldPools();
  if (res.ok && Array.isArray(res.data?.data)) {
    const items = res.data.data
      .filter((p) => (p.tvlUsd ?? 0) > 1_000_000 && (p.apy ?? 0) > 0 && (p.apy ?? 0) < 200)
      .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
      .slice(0, 200)
      .map((p) => ({
        pool: p.pool,
        project: p.project,
        chain: p.chain,
        symbol: p.symbol,
        tvlUsd: p.tvlUsd,
        apy: p.apy,
        apyBase: p.apyBase,
        apyReward: p.apyReward,
        stablecoin: p.stablecoin,
        ilRisk: p.ilRisk,
        exposure: p.exposure,
      }));
    const env = envelope({ data: { items }, status: "live", provider: "defillama-yields" });
    cacheSet(CACHE_KEY, env, CACHE_TTL);
    return NextResponse.json(env);
  }
  return NextResponse.json(envelope({ data: { items: [] }, status: "error", error: res.error }));
}

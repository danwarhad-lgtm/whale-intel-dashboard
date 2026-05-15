import { NextResponse } from "next/server";
import { dllOverviewDexs } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_KEY = "dex-volume";
const CACHE_TTL = 5 * 60_000;

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);
  const res = await dllOverviewDexs();
  if (res.ok) {
    const d = res.data ?? {};
    const protocols = (d.protocols ?? [])
      .sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))
      .slice(0, 50)
      .map((p) => ({
        name: p.name,
        category: p.category,
        chains: p.chains,
        total24h: p.total24h,
        total7d: p.total7d,
        change1d: p.change_1d,
        change7d: p.change_7d,
        logo: p.logo,
      }));
    const env = envelope({
      data: { total24h: d.total24h, total7d: d.total7d, total30d: d.total30d, protocols },
      status: "live",
      provider: "defillama-dexs",
    });
    cacheSet(CACHE_KEY, env, CACHE_TTL);
    return NextResponse.json(env);
  }
  return NextResponse.json(envelope({ data: { total24h: 0, protocols: [] }, status: "error", error: res.error }));
}

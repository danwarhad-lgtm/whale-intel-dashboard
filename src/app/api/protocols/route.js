import { NextResponse } from "next/server";
import { dllProtocols } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_KEY = "protocols";
const CACHE_TTL = 5 * 60_000;

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);
  const res = await dllProtocols();
  if (res.ok && Array.isArray(res.data)) {
    const items = res.data
      .filter((p) => (p.tvl ?? 0) > 5_000_000)
      .slice(0, 100)
      .map((p) => ({
        name: p.name,
        symbol: p.symbol,
        slug: p.slug,
        category: p.category,
        chains: p.chains,
        tvl: p.tvl,
        change1h: p.change_1h,
        change1d: p.change_1d,
        change7d: p.change_7d,
        mcap: p.mcap,
        logo: p.logo,
        url: p.url,
      }));
    const env = envelope({ data: { items }, status: "live", provider: "defillama" });
    cacheSet(CACHE_KEY, env, CACHE_TTL);
    return NextResponse.json(env);
  }
  return NextResponse.json(envelope({ data: { items: [] }, status: "error", error: res.error }));
}

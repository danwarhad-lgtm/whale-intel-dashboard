import { NextResponse } from "next/server";
import { cgCategories } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_KEY = "categories";
const CACHE_TTL = 5 * 60_000;

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);
  const res = await cgCategories();
  if (res.ok && Array.isArray(res.data)) {
    const items = res.data
      .filter((c) => (c.market_cap ?? 0) > 0)
      .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
      .slice(0, 80)
      .map((c) => ({
        id: c.id,
        name: c.name,
        marketCap: c.market_cap,
        marketCapChange24h: c.market_cap_change_24h,
        volume24h: c.volume_24h,
        top3Coins: c.top_3_coins,
      }));
    const env = envelope({ data: { items }, status: "live", provider: "coingecko" });
    cacheSet(CACHE_KEY, env, CACHE_TTL);
    return NextResponse.json(env);
  }
  return NextResponse.json(envelope({ data: { items: [] }, status: "error", error: res.error }));
}

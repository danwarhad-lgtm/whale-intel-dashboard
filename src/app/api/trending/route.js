import { NextResponse } from "next/server";
import { cgTrending } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_KEY = "trending";
const CACHE_TTL = 90_000;

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);
  const res = await cgTrending();
  if (res.ok) {
    const d = res.data ?? {};
    const data = {
      coins: (d.coins ?? []).map((c) => ({
        id: c.item?.id,
        name: c.item?.name,
        symbol: c.item?.symbol,
        rank: c.item?.market_cap_rank,
        thumb: c.item?.thumb,
        score: c.item?.score,
        priceBtc: c.item?.price_btc,
        data: c.item?.data,
      })),
      nfts: (d.nfts ?? []).slice(0, 7).map((n) => ({
        id: n.id,
        name: n.name,
        symbol: n.symbol,
        thumb: n.thumb,
        floorPriceUsd: n.data?.floor_price_in_usd_24h_percentage_change,
      })),
      categories: (d.categories ?? []).slice(0, 7).map((c) => ({
        id: c.id,
        name: c.name,
        change: c.market_cap_1h_change,
      })),
    };
    const env = envelope({ data, status: "live", provider: "coingecko" });
    cacheSet(CACHE_KEY, env, CACHE_TTL);
    return NextResponse.json(env);
  }
  return NextResponse.json(envelope({ data: { coins: [], nfts: [], categories: [] }, status: "error", error: res.error }));
}

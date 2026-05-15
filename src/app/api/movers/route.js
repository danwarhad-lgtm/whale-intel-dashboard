import { NextResponse } from "next/server";
import { cgMarkets } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_TTL = 60_000;

export async function GET(req) {
  const url = new URL(req.url);
  const window = url.searchParams.get("window") || "24h"; // 1h, 24h, 7d, 30d
  const minMcap = parseFloat(url.searchParams.get("minMcap") || "100000000");
  const key = `movers:${window}:${minMcap}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  // fetch top 250 by mcap
  const res = await cgMarkets(250, 1);
  if (!res.ok) return NextResponse.json(envelope({ data: { gainers: [], losers: [] }, status: "error", error: res.error }));

  const fieldMap = {
    "1h": "price_change_percentage_1h_in_currency",
    "24h": "price_change_percentage_24h",
    "7d": "price_change_percentage_7d_in_currency",
    "30d": "price_change_percentage_30d_in_currency",
  };
  const field = fieldMap[window] || fieldMap["24h"];
  const filtered = (res.data ?? []).filter((c) => (c.market_cap ?? 0) >= minMcap && typeof c[field] === "number");
  const sorted = [...filtered].sort((a, b) => b[field] - a[field]);
  const gainers = sorted.slice(0, 30).map((c) => ({ id: c.id, symbol: c.symbol, name: c.name, image: c.image, price: c.current_price, mcap: c.market_cap, change: c[field], rank: c.market_cap_rank }));
  const losers = sorted.slice(-30).reverse().map((c) => ({ id: c.id, symbol: c.symbol, name: c.name, image: c.image, price: c.current_price, mcap: c.market_cap, change: c[field], rank: c.market_cap_rank }));
  const env = envelope({ data: { gainers, losers, window }, status: "live", provider: "coingecko" });
  cacheSet(key, env, CACHE_TTL);
  return NextResponse.json(env);
}

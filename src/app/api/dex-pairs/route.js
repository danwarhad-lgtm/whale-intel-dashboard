import { NextResponse } from "next/server";
import { dexscreenerSearch } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_TTL = 60_000;

export async function GET(req) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  if (!q) return NextResponse.json(envelope({ data: { pairs: [] }, status: "live", provider: "dexscreener" }));
  const key = `dex:${q.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);
  const res = await dexscreenerSearch(q);
  if (!res.ok) return NextResponse.json(envelope({ data: { pairs: [] }, status: "error", error: res.error }));
  const pairs = (res.data?.pairs ?? []).slice(0, 30).map((p) => ({
    chainId: p.chainId,
    dexId: p.dexId,
    pairAddress: p.pairAddress,
    baseSymbol: p.baseToken?.symbol,
    baseName: p.baseToken?.name,
    baseAddress: p.baseToken?.address,
    quoteSymbol: p.quoteToken?.symbol,
    priceUsd: parseFloat(p.priceUsd ?? 0),
    priceNative: parseFloat(p.priceNative ?? 0),
    liquidity: p.liquidity?.usd ?? 0,
    fdv: p.fdv ?? 0,
    mcap: p.marketCap ?? 0,
    volume24h: p.volume?.h24 ?? 0,
    txns24h: (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0),
    change5m: p.priceChange?.m5,
    change1h: p.priceChange?.h1,
    change24h: p.priceChange?.h24,
    age: p.pairCreatedAt,
    url: p.url,
  }));
  const env = envelope({ data: { pairs }, status: "live", provider: "dexscreener" });
  cacheSet(key, env, CACHE_TTL);
  return NextResponse.json(env);
}

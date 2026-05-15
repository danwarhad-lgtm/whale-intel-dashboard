import { NextResponse } from "next/server";
import { dllChains, dllProtocols } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_KEY = "tvl";
const CACHE_TTL = 5 * 60_000;

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);
  const [chainsRes, protoRes] = await Promise.all([dllChains(), dllProtocols()]);
  const chains = chainsRes.ok && Array.isArray(chainsRes.data)
    ? chainsRes.data
        .filter((c) => (c.tvl ?? 0) > 1_000_000)
        .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
        .slice(0, 30)
        .map((c) => ({ name: c.name, tvl: c.tvl, tokenSymbol: c.tokenSymbol, chainId: c.chainId }))
    : [];
  const totalTvl = chains.reduce((acc, c) => acc + (c.tvl ?? 0), 0);
  const protocolsCount = protoRes.ok && Array.isArray(protoRes.data) ? protoRes.data.length : 0;
  const top10Tvl = chains.slice(0, 10).reduce((acc, c) => acc + (c.tvl ?? 0), 0);
  const env = envelope({
    data: { chains, totalTvl, protocolsCount, top10Concentration: totalTvl > 0 ? top10Tvl / totalTvl : 0 },
    status: chainsRes.ok ? "live" : "error",
    provider: "defillama",
  });
  cacheSet(CACHE_KEY, env, CACHE_TTL);
  return NextResponse.json(env);
}

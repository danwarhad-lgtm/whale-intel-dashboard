import { NextResponse } from "next/server";
import { owlracleGas } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_TTL = 30_000;

export async function GET(req) {
  const url = new URL(req.url);
  const chain = url.searchParams.get("chain") || "eth";
  const key = `gas:${chain}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);
  const res = await owlracleGas(chain);
  if (res.ok) {
    const d = res.data ?? {};
    const speeds = d.speeds ?? [];
    const env = envelope({
      data: {
        chain,
        timestamp: d.timestamp,
        avgTime: d.avgTime,
        avgGas: d.avgGas,
        baseFee: speeds[0]?.baseFee ?? null,
        slow: speeds[0] ?? null,
        standard: speeds[1] ?? null,
        fast: speeds[2] ?? null,
        instant: speeds[3] ?? null,
      },
      status: "live",
      provider: "owlracle",
    });
    cacheSet(key, env, CACHE_TTL);
    return NextResponse.json(env);
  }
  return NextResponse.json(envelope({ data: null, status: "error", error: res.error }));
}

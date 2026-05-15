import { NextResponse } from "next/server";
import { altFearGreed } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_KEY = "fear-greed";
const CACHE_TTL = 5 * 60_000;

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);
  const res = await altFearGreed(60);
  if (res.ok) {
    const items = (res.data?.data ?? []).map((d) => ({
      value: parseInt(d.value, 10),
      label: d.value_classification,
      timestamp: parseInt(d.timestamp, 10) * 1000,
    }));
    const current = items[0] ?? null;
    const env = envelope({
      data: { current, history: items.reverse() },
      status: "live",
      provider: "alternative.me",
    });
    cacheSet(CACHE_KEY, env, CACHE_TTL);
    return NextResponse.json(env);
  }
  return NextResponse.json(envelope({ data: { current: null, history: [] }, status: "error", error: res.error }));
}

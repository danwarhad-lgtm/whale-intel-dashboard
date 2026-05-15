/**
 * Proxies to the Go /api/health serverless function on Vercel.
 * In local dev the Go function isn't compiled, so we fall back to live pings
 * from this Node route.
 */
import { NextResponse } from "next/server";
import { envelope } from "@/lib/api-helpers";
import { cgPing, dllPing, binancePing } from "@/lib/api-clients";

export const dynamic = "force-dynamic";

function buildHealthUrl(req) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  if (!host) return null;
  return `${proto}://${host}/api/health`;
}

export async function GET(req) {
  const url = buildHealthUrl(req);
  if (url) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(
          envelope({
            data,
            status: "live",
            provider: "go:vercel-serverless",
          }),
        );
      }
    } catch {
      /* fall through */
    }
  }

  // Local fallback — ping the 3 free APIs from this Node route.
  const checks = await Promise.all([
    cgPing().then((r) => ({
      provider: "CoinGecko",
      status: r.ok ? "ok" : "down",
      latencyMs: r.latencyMs,
      message: r.error ?? "ok",
      checkedAt: new Date().toISOString(),
    })),
    dllPing().then((r) => ({
      provider: "DefiLlama",
      status: r.ok ? "ok" : "down",
      latencyMs: r.latencyMs,
      message: r.error ?? "ok",
      checkedAt: new Date().toISOString(),
    })),
    binancePing().then((r) => ({
      provider: "Binance",
      status: r.ok ? "ok" : "down",
      latencyMs: r.latencyMs,
      message: r.error ?? "ok",
      checkedAt: new Date().toISOString(),
    })),
  ]);

  return NextResponse.json(
    envelope({
      data: checks,
      status: "fallback",
      provider: "javascript:local-fallback",
      error: "Go /api/health unavailable in this environment",
    }),
  );
}

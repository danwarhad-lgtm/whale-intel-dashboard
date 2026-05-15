/**
 * Proxies POST to the Python /api/score serverless function on Vercel.
 * In local dev (non-Vercel) the Python function isn't running, so we fall back
 * to a JS implementation of the same scoring formula. This keeps the dashboard
 * working in both environments.
 */
import { NextResponse } from "next/server";
import { calculateMarketRiskScore } from "@/lib/scoring";
import { envelope } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function buildScoreUrl(req) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  if (!host) return null;
  return `${proto}://${host}/api/score`;
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const url = buildScoreUrl(req);
  if (url) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(
          envelope({
            data,
            status: "live",
            provider: "python:vercel-serverless",
          }),
        );
      }
    } catch {
      /* fall through */
    }
  }

  // Local fallback (Python function not running, e.g. `next dev`)
  const result = calculateMarketRiskScore({
    btcChange24h: body?.market?.btcChange24h ?? 0,
    ethChange24h: body?.market?.ethChange24h ?? 0,
    volumeChangePct: body?.market?.volumeChangePct ?? 0,
    whaleScore: body?.whale?.score ?? 0,
    exchangeScore: body?.exchange?.score ?? 50,
    stablecoinScore: body?.stable?.score ?? 80,
  });

  return NextResponse.json(
    envelope({
      data: result,
      status: "fallback",
      provider: "javascript:local-fallback",
      error: "Python /api/score unavailable in this environment",
    }),
  );
}

export async function GET() {
  return NextResponse.json(
    envelope({
      data: { hint: "POST {market, whale, exchange, stable}" },
      status: "live",
      provider: "internal",
    }),
  );
}

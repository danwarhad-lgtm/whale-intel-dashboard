import { NextResponse } from "next/server";
import { generateMockExchangeFlows } from "@/lib/mocks";
import { envelope } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const exchangeFilter = searchParams.get("exchange") ?? "all";
  const tokenFilter = searchParams.get("token") ?? "all";
  const timeRange = searchParams.get("timeRange") ?? "24h";

  const snap = generateMockExchangeFlows();

  let leaderboard = snap.summary.slice();
  if (exchangeFilter !== "all") {
    leaderboard = leaderboard.filter(
      (r) => r.exchange.toLowerCase() === exchangeFilter.toLowerCase(),
    );
  }
  leaderboard.sort((a, b) => b.inflowUsd + b.outflowUsd - (a.inflowUsd + a.outflowUsd));

  let byToken = snap.byToken;
  if (tokenFilter !== "all") {
    byToken = byToken.filter(
      (r) => r.token.toLowerCase() === tokenFilter.toLowerCase(),
    );
  }
  if (exchangeFilter !== "all") {
    byToken = byToken.filter(
      (r) => r.exchange.toLowerCase() === exchangeFilter.toLowerCase(),
    );
  }

  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 1;
  const history = snap.history.slice(-Math.max(days, 1));

  const totalInflow = leaderboard.reduce((acc, r) => acc + r.inflowUsd, 0);
  const totalOutflow = leaderboard.reduce((acc, r) => acc + r.outflowUsd, 0);
  const netflowUsd = totalOutflow - totalInflow;
  const txCount = leaderboard.reduce((acc, r) => acc + r.txCount, 0);

  return NextResponse.json(
    envelope({
      data: {
        leaderboard,
        byToken,
        history,
        summary: {
          totalInflow,
          totalOutflow,
          netflowUsd,
          txCount,
          timeRange,
        },
      },
      status: "simulated",
      provider: "internal-simulator",
    }),
  );
}

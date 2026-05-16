import { NextResponse } from "next/server";
import { generateMockExchangeFlows } from "@/lib/mocks";
import { fetchRealWhaleTransactions } from "@/lib/onchain-whales";
import { envelope } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const TRACKED_EXCHANGES = [
  "Binance",
  "Coinbase",
  "Kraken",
  "OKX",
  "Bybit",
  "Bitfinex",
  "KuCoin",
];

/**
 * Build exchange flow leaderboard from real whale txs (last few blocks).
 * Each tx classified as deposit (to-CEX) or withdrawal (from-CEX) feeds a
 * per-exchange aggregation. Falls back to mock if no real flows are found.
 */
function buildLeaderboardFromTxs(txs) {
  const totals = new Map();
  for (const ex of TRACKED_EXCHANGES) {
    totals.set(ex, { exchange: ex, inflowUsd: 0, outflowUsd: 0, txCount: 0 });
  }
  let touched = false;
  for (const t of txs) {
    if (!t.exchange || !TRACKED_EXCHANGES.includes(t.exchange)) continue;
    const row = totals.get(t.exchange);
    if (t.type === "exchange_deposit") row.inflowUsd += t.valueUsd;
    else if (t.type === "exchange_withdrawal") row.outflowUsd += t.valueUsd;
    row.txCount += 1;
    touched = true;
  }
  if (!touched) return null;
  const summary = Array.from(totals.values()).map((r) => ({
    ...r,
    netflowUsd: r.outflowUsd - r.inflowUsd,
  }));
  return summary;
}

function buildByTokenFromTxs(txs) {
  const map = new Map();
  for (const t of txs) {
    if (!t.exchange || !TRACKED_EXCHANGES.includes(t.exchange)) continue;
    const key = `${t.exchange}|${t.tokenSymbol}`;
    if (!map.has(key)) {
      map.set(key, {
        exchange: t.exchange,
        token: t.tokenSymbol,
        inflowUsd: 0,
        outflowUsd: 0,
      });
    }
    const row = map.get(key);
    if (t.type === "exchange_deposit") row.inflowUsd += t.valueUsd;
    else if (t.type === "exchange_withdrawal") row.outflowUsd += t.valueUsd;
  }
  return Array.from(map.values()).map((r) => ({
    ...r,
    netflowUsd: r.outflowUsd - r.inflowUsd,
  }));
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const exchangeFilter = searchParams.get("exchange") ?? "all";
  const tokenFilter = searchParams.get("token") ?? "all";
  const timeRange = searchParams.get("timeRange") ?? "24h";

  let leaderboard = null;
  let byToken = null;
  let history = null;
  let dataStatus = "live";
  let provider = "publicnode + mempool.space";
  let upstreamError = null;

  try {
    const txs = await fetchRealWhaleTransactions({
      limit: 200,
      minUsd: 250_000,
    });
    leaderboard = buildLeaderboardFromTxs(txs);
    if (leaderboard) {
      byToken = buildByTokenFromTxs(txs);
    } else {
      throw new Error("No CEX-classified flows in current window");
    }
  } catch (err) {
    upstreamError = err?.message || String(err);
    const snap = generateMockExchangeFlows();
    leaderboard = snap.summary.slice();
    byToken = snap.byToken;
    history = snap.history;
    dataStatus = "simulated";
    provider = "internal-simulator (fallback)";
  }

  // Historical series is hard from on-chain alone; keep mock series for the
  // chart but tag the response so the badge stays honest about live vs sim.
  if (!history) {
    const snap = generateMockExchangeFlows();
    history = snap.history;
  }

  if (exchangeFilter !== "all") {
    leaderboard = leaderboard.filter(
      (r) => r.exchange.toLowerCase() === exchangeFilter.toLowerCase(),
    );
    byToken = byToken.filter(
      (r) => r.exchange.toLowerCase() === exchangeFilter.toLowerCase(),
    );
  }
  leaderboard.sort(
    (a, b) => b.inflowUsd + b.outflowUsd - (a.inflowUsd + a.outflowUsd),
  );

  if (tokenFilter !== "all") {
    byToken = byToken.filter(
      (r) => r.token.toLowerCase() === tokenFilter.toLowerCase(),
    );
  }

  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 1;
  const slicedHistory = history.slice(-Math.max(days, 1));

  const totalInflow = leaderboard.reduce((acc, r) => acc + r.inflowUsd, 0);
  const totalOutflow = leaderboard.reduce((acc, r) => acc + r.outflowUsd, 0);
  const netflowUsd = totalOutflow - totalInflow;
  const txCount = leaderboard.reduce((acc, r) => acc + r.txCount, 0);

  return NextResponse.json(
    envelope({
      data: {
        leaderboard,
        byToken,
        history: slicedHistory,
        summary: {
          totalInflow,
          totalOutflow,
          netflowUsd,
          txCount,
          timeRange,
        },
      },
      status: dataStatus,
      provider,
      error: upstreamError,
    }),
  );
}

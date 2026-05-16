import { NextResponse } from "next/server";
import { generateMockWhaleTransactions } from "@/lib/mocks";
import { fetchRealWhaleTransactions } from "@/lib/onchain-whales";
import { envelope } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const chain = searchParams.get("chain") ?? "all";
  const token = searchParams.get("token") ?? "all";
  const type = searchParams.get("type") ?? "all";
  const severity = searchParams.get("severity") ?? "all";
  const minUsdRaw = searchParams.get("minUsd");
  const minUsd = minUsdRaw ? Number(minUsdRaw) : 0;
  const search = (searchParams.get("search") ?? "").toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 25)));

  let all = [];
  let dataStatus = "live";
  let provider = "publicnode + mempool.space";
  let upstreamError = null;

  try {
    all = await fetchRealWhaleTransactions({ limit: 120, minUsd: 250_000 });
    if (!all.length) throw new Error("Empty result from upstream");
  } catch (err) {
    upstreamError = err?.message || String(err);
    all = generateMockWhaleTransactions(50);
    dataStatus = "fallback";
    provider = "internal-fallback";
  }

  let filtered = all;
  if (chain !== "all") filtered = filtered.filter((t) => t.chain === chain);
  if (token !== "all")
    filtered = filtered.filter(
      (t) => t.tokenSymbol.toLowerCase() === token.toLowerCase(),
    );
  if (type !== "all") filtered = filtered.filter((t) => t.type === type);
  if (severity !== "all")
    filtered = filtered.filter((t) => t.severity === severity);
  if (minUsd > 0) filtered = filtered.filter((t) => t.valueUsd >= minUsd);
  if (search) {
    filtered = filtered.filter(
      (t) =>
        t.hash.toLowerCase().includes(search) ||
        t.fromAddress.toLowerCase().includes(search) ||
        t.toAddress.toLowerCase().includes(search) ||
        t.tokenSymbol.toLowerCase().includes(search) ||
        (t.fromLabel ?? "").toLowerCase().includes(search) ||
        (t.toLabel ?? "").toLowerCase().includes(search),
    );
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const transactions = filtered.slice(start, start + limit);

  // Summary computed from filtered set so card numbers reflect filters
  const totalVolume = filtered.reduce((acc, t) => acc + t.valueUsd, 0);
  const criticalCount = filtered.filter((t) => t.severity === "critical").length;
  const exchangeDeposits = filtered.filter(
    (t) => t.type === "exchange_deposit",
  ).length;
  const exchangeWithdrawals = filtered.filter(
    (t) => t.type === "exchange_withdrawal",
  ).length;

  const destCounts = new Map();
  for (const t of filtered) {
    const key = t.toLabel ?? "Unknown";
    destCounts.set(key, (destCounts.get(key) ?? 0) + 1);
  }
  const topDestinations = Array.from(destCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const tokenCounts = new Map();
  for (const t of filtered) {
    tokenCounts.set(
      t.tokenSymbol,
      (tokenCounts.get(t.tokenSymbol) ?? 0) + 1,
    );
  }
  const topTokens = Array.from(tokenCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symbol, count]) => ({ symbol, count }));

  return NextResponse.json(
    envelope({
      data: {
        transactions,
        total,
        page,
        limit,
        summary: {
          totalVolume,
          criticalCount,
          exchangeDeposits,
          exchangeWithdrawals,
          topDestinations,
          topTokens,
        },
      },
      status: dataStatus,
      provider,
      error: upstreamError,
    }),
  );
}

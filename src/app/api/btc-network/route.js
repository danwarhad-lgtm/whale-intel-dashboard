import { NextResponse } from "next/server";
import { mempoolHashrate, mempoolDifficulty, mempoolFees, mempoolStats, mempoolBlocks } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const CACHE_TTL = 60_000;

const HALVING_BLOCK_HEIGHTS = [210000, 420000, 630000, 840000, 1050000, 1260000];

export async function GET() {
  const cached = cacheGet("btc-net");
  if (cached) return NextResponse.json(cached);
  const [hashRes, diffRes, feesRes, statsRes, blocksRes] = await Promise.all([
    mempoolHashrate("3y"), mempoolDifficulty(), mempoolFees(), mempoolStats(), mempoolBlocks(),
  ]);
  const data = {};
  if (hashRes.ok) {
    const h = hashRes.data ?? {};
    data.currentHashrate = h.currentHashrate;
    data.currentDifficulty = h.currentDifficulty;
    data.hashrateHistory = (h.hashrates ?? []).slice(-90).map((x) => ({ ts: x.timestamp * 1000, value: x.avgHashrate }));
  }
  if (diffRes.ok) {
    const d = diffRes.data ?? {};
    data.difficultyChange = d.difficultyChange;
    data.progressPercent = d.progressPercent;
    data.estimatedRetargetDate = d.estimatedRetargetDate;
    data.remainingBlocks = d.remainingBlocks;
    data.previousRetarget = d.previousRetarget;
    data.nextRetargetHeight = d.nextRetargetHeight;
  }
  if (feesRes.ok) {
    data.fees = feesRes.data;
  }
  if (statsRes.ok) {
    data.mempool = {
      txCount: statsRes.data?.count,
      vSize: statsRes.data?.vsize,
      totalFee: statsRes.data?.total_fee,
    };
  }
  if (blocksRes.ok && Array.isArray(blocksRes.data)) {
    const latest = blocksRes.data[0];
    data.latestBlock = {
      height: latest?.height,
      timestamp: latest?.timestamp,
      txCount: latest?.tx_count,
      size: latest?.size,
    };
    // halving countdown
    const next = HALVING_BLOCK_HEIGHTS.find((h) => h > (latest?.height ?? 0));
    if (next && latest?.height) {
      data.nextHalving = {
        atHeight: next,
        blocksRemaining: next - latest.height,
        estimatedDate: Date.now() + (next - latest.height) * 10 * 60 * 1000,
      };
    }
  }
  const env = envelope({ data, status: "live", provider: "mempool.space" });
  cacheSet("btc-net", env, CACHE_TTL);
  return NextResponse.json(env);
}

"use client";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { Bitcoin, Zap, Clock, Layers, AlertCircle, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { cn } from "@/lib/utils";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function formatHashrate(hps) {
  if (!hps) return "—";
  const ehs = hps / 1e18;
  return `${ehs.toFixed(1)} EH/s`;
}
function formatDifficulty(d) {
  if (!d) return "—";
  return `${(d / 1e12).toFixed(2)}T`;
}

export default function BtcNetworkPage() {
  const q = useQuery({ queryKey: ["btc-net"], queryFn: () => fetchJson("/api/btc-network"), refetchInterval: 60_000 });
  const d = q.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Bitcoin Network</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Hashrate, difficulty, mempool, and halving countdown via mempool.space.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      {q.isLoading ? <CardSkeleton rows={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Zap} label="Hashrate" value={formatHashrate(d?.currentHashrate)} hint="3-day avg" />
            <StatCard label="Difficulty" value={formatDifficulty(d?.currentDifficulty)} hint={d?.difficultyChange ? `${d.difficultyChange.toFixed(2)}% next` : ""} />
            <StatCard icon={Layers} label="Latest block" value={d?.latestBlock?.height ?? "—"} hint={d?.latestBlock?.txCount ? `${d.latestBlock.txCount.toLocaleString()} tx` : ""} />
            <StatCard icon={AlertCircle} label="Mempool" value={d?.mempool?.txCount ? d.mempool.txCount.toLocaleString() : "—"} hint="pending tx" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" />Next halving</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {d?.nextHalving ? (
                  <>
                    <div className="font-mono text-2xl font-semibold tabular-nums text-primary">
                      Block {d.nextHalving.atHeight.toLocaleString()}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Blocks remaining</div>
                        <div className="font-mono tabular-nums">{d.nextHalving.blocksRemaining.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Estimated date</div>
                        <div className="font-mono tabular-nums">{new Date(d.nextHalving.estimatedDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </>
                ) : <p className="text-sm text-muted-foreground">No upcoming halving data.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Difficulty retarget</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {d?.estimatedRetargetDate ? (
                  <>
                    <div className="text-sm">
                      <div className="text-xs text-muted-foreground">ETA</div>
                      <div className="font-mono tabular-nums">{new Date(d.estimatedRetargetDate).toLocaleString()}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-xs text-muted-foreground">Progress</div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${d.progressPercent}%` }} />
                      </div>
                      <div className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">{d.progressPercent?.toFixed(2)}% · {d.remainingBlocks} blocks left</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Predicted change</div>
                        <div className={cn("font-mono tabular-nums", (d.difficultyChange ?? 0) >= 0 ? "text-success" : "text-danger")}>
                          {(d.difficultyChange ?? 0) >= 0 ? "+" : ""}{d.difficultyChange?.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Previous retarget</div>
                        <div className={cn("font-mono tabular-nums", (d.previousRetarget ?? 0) >= 0 ? "text-success" : "text-danger")}>
                          {(d.previousRetarget ?? 0) >= 0 ? "+" : ""}{d.previousRetarget?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Hashrate (90d)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer>
                  <AreaChart data={(d?.hashrateHistory ?? []).map((p) => ({ ts: p.ts, value: p.value / 1e18 }))}>
                    <defs>
                      <linearGradient id="hashGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="ts" tick={{ fontSize: 10, fill: "#8b94a8" }} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                    <YAxis tick={{ fontSize: 10, fill: "#8b94a8" }} unit=" EH/s" />
                    <Tooltip contentStyle={{ background: "#0d1119", border: "1px solid #1c2436", borderRadius: 8 }} formatter={(v) => `${v.toFixed(1)} EH/s`} labelFormatter={(v) => new Date(v).toLocaleDateString()} />
                    <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fill="url(#hashGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {d?.fees ? (
            <Card>
              <CardHeader><CardTitle>Fees (sats/vB)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Fastest" value={`${d.fees.fastestFee} sat/vB`} />
                <StatCard label="Half hour" value={`${d.fees.halfHourFee} sat/vB`} />
                <StatCard label="Hour" value={`${d.fees.hourFee} sat/vB`} />
                <StatCard label="Economy" value={`${d.fees.economyFee} sat/vB`} />
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

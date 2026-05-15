"use client";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { CardSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatUsdCompact } from "@/lib/format";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export default function OpenInterestPage() {
  const q = useQuery({ queryKey: ["oi"], queryFn: () => fetchJson("/api/open-interest"), refetchInterval: 60_000 });
  const d = q.data?.data;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Open Interest</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Total OI across top 20 perp markets. Rising OI = new positions, falling = unwinds.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      {q.isLoading ? <CardSkeleton rows={4} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={BarChart3} label="Total OI notional" value={formatUsdCompact(d?.totalNotional ?? 0)} />
            <StatCard label="Top symbol" value={items[0]?.symbol ?? "—"} hint={items[0] ? formatUsdCompact(items[0].notionalUsd) : ""} />
            <StatCard label="Markets tracked" value={items.length} />
          </div>

          <Card>
            <CardHeader><CardTitle>OI by symbol (notional USD)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[420px] w-full">
                <ResponsiveContainer>
                  <BarChart data={items} layout="vertical" margin={{ left: 50 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="symbol" tick={{ fontSize: 11, fill: "#8b94a8" }} width={60} />
                    <Tooltip contentStyle={{ background: "#0d1119", border: "1px solid #1c2436", borderRadius: 8 }} formatter={(v) => formatUsdCompact(v)} />
                    <Bar dataKey="notionalUsd" radius={[0, 4, 4, 0]}>
                      {items.map((_, i) => <Cell key={i} fill={`hsl(${(i * 18) % 360} 70% 60%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

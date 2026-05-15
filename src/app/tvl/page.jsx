"use client";
import { useQuery } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { GridSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatUsdCompact } from "@/lib/format";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export default function TvlPage() {
  const q = useQuery({ queryKey: ["tvl"], queryFn: () => fetchJson("/api/tvl"), refetchInterval: 5 * 60_000 });
  const d = q.data?.data;
  const chains = d?.chains ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">TVL Monitor</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Total Value Locked across chains. DefiLlama aggregated.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      {q.isLoading ? <GridSkeleton count={4} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Layers} label="Total TVL" value={formatUsdCompact(d?.totalTvl ?? 0)} hint={`${chains.length} chains`} />
            <StatCard label="Top 10 share" value={`${((d?.top10Concentration ?? 0) * 100).toFixed(1)}%`} hint="Concentration" />
            <StatCard label="Protocols" value={(d?.protocolsCount ?? 0).toLocaleString()} hint="Tracked by DefiLlama" />
            <StatCard label="Top chain" value={chains[0]?.name ?? "—"} hint={chains[0] ? formatUsdCompact(chains[0].tvl) : ""} />
          </div>

          <Card>
            <CardHeader><CardTitle>TVL by chain</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[420px] w-full">
                <ResponsiveContainer>
                  <BarChart data={chains.slice(0, 20)} layout="vertical" margin={{ left: 60 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8b94a8" }} width={80} />
                    <Tooltip contentStyle={{ background: "#0d1119", border: "1px solid #1c2436", borderRadius: 8 }} formatter={(v) => formatUsdCompact(v)} />
                    <Bar dataKey="tvl" fill="#818cf8" radius={[0, 4, 4, 0]} />
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

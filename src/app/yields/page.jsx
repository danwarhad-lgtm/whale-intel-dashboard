"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatUsdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export default function YieldsPage() {
  const q = useQuery({ queryKey: ["yields"], queryFn: () => fetchJson("/api/yields"), refetchInterval: 5 * 60_000 });
  const [search, setSearch] = React.useState("");
  const [risk, setRisk] = React.useState("all");
  const [stable, setStable] = React.useState("all");

  const items = (q.data?.data?.items ?? []).filter((p) => {
    if (search && !`${p.symbol} ${p.project} ${p.chain}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (risk !== "all" && p.ilRisk !== risk) return false;
    if (stable === "yes" && !p.stablecoin) return false;
    if (stable === "no" && p.stablecoin) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Yields</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Top DeFi pools by APY (TVL &gt; $1M, APY 0–200% sanity-clipped).
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input placeholder="Search symbol, project, chain..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger><SelectValue placeholder="IL risk" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All IL risk</SelectItem>
              <SelectItem value="no">No IL</SelectItem>
              <SelectItem value="yes">Has IL</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stable} onValueChange={setStable}>
            <SelectTrigger><SelectValue placeholder="Stablecoin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assets</SelectItem>
              <SelectItem value="yes">Stablecoins only</SelectItem>
              <SelectItem value="no">Non-stable only</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {q.isLoading ? <div className="p-5"><TableSkeleton rows={10} /></div> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Chain</th>
                    <th className="px-4 py-3 text-right">TVL</th>
                    <th className="px-4 py-3 text-right">APY</th>
                    <th className="px-4 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 100).map((p) => (
                    <tr key={p.pool} className="border-b border-border/40 transition-colors hover:bg-accent/30">
                      <td className="px-4 py-3 font-medium">{p.project}</td>
                      <td className="px-4 py-3 font-mono text-xs">{p.symbol}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.chain}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{formatUsdCompact(p.tvlUsd ?? 0)}</td>
                      <td className={cn("px-4 py-3 text-right font-mono font-semibold tabular-nums", (p.apy ?? 0) >= 20 ? "text-warning" : "text-success")}>
                        {(p.apy ?? 0).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 space-x-1">
                        {p.stablecoin ? <Badge variant="info">Stable</Badge> : null}
                        {p.ilRisk === "yes" ? <Badge variant="warning">IL</Badge> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

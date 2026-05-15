"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { cn } from "@/lib/utils";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export default function FundingPage() {
  const q = useQuery({ queryKey: ["funding"], queryFn: () => fetchJson("/api/funding"), refetchInterval: 60_000 });
  const [search, setSearch] = React.useState("");
  const items = (q.data?.data?.items ?? []).filter((x) => !search || x.symbol.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Funding Rates</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Binance perpetuals funding. Positive = longs pay shorts. Extreme rates → leverage imbalance.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Top 100 by abs(funding)</CardTitle>
            <Input className="max-w-xs" placeholder="Filter symbol..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {q.isLoading ? <div className="p-5"><TableSkeleton rows={10} /></div> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3 text-right">Mark</th>
                    <th className="px-4 py-3 text-right">Funding</th>
                    <th className="px-4 py-3 text-right">APR</th>
                    <th className="px-4 py-3">Bias</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((x) => {
                    const apr = x.fundingRate * 3 * 365 * 100;
                    return (
                      <tr key={x.pair} className="border-b border-border/40 hover:bg-accent/30">
                        <td className="px-4 py-3 font-mono font-semibold">{x.symbol}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">${x.markPrice < 1 ? x.markPrice.toFixed(6) : x.markPrice.toFixed(2)}</td>
                        <td className={cn("px-4 py-3 text-right font-mono tabular-nums", x.fundingRate >= 0 ? "text-success" : "text-danger")}>
                          {(x.fundingRate * 100).toFixed(4)}%
                        </td>
                        <td className={cn("px-4 py-3 text-right font-mono tabular-nums", apr >= 0 ? "text-success" : "text-danger")}>
                          {apr.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3">
                          {x.fundingRate > 0 ? <span className="inline-flex items-center gap-1 text-xs text-success"><TrendingUp className="h-3 w-3" />Longs paying</span> : x.fundingRate < 0 ? <span className="inline-flex items-center gap-1 text-xs text-danger"><TrendingDown className="h-3 w-3" />Shorts paying</span> : <span className="text-xs text-muted-foreground">Neutral</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

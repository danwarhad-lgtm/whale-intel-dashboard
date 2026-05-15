"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatUsd, formatUsdCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

const WINDOWS = ["1h", "24h", "7d", "30d"];

function MoversTable({ items, kind }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Token</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Change</th>
            <th className="px-4 py-3 text-right">Mcap</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c, i) => (
            <tr key={c.id} className="border-b border-border/40 hover:bg-accent/30">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular-nums">{i + 1}</td>
              <td className="px-4 py-3">
                <Link href={`/token/${c.id}`} className="flex items-center gap-2 hover:text-primary">
                  {c.image ? <img src={c.image} alt="" className="h-6 w-6 rounded-full" /> : null}
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.symbol} · #{c.rank ?? "—"}</div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{formatUsd(c.price ?? 0, (c.price ?? 0) < 1 ? 6 : 2)}</td>
              <td className={cn("px-4 py-3 text-right font-mono font-semibold tabular-nums", (c.change ?? 0) >= 0 ? "text-success" : "text-danger")}>
                <span className="inline-flex items-center gap-1 justify-end">
                  {kind === "gain" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPercent(c.change ?? 0)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{formatUsdCompact(c.mcap ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MoversPage() {
  const [window, setWindow] = React.useState("24h");
  const q = useQuery({
    queryKey: ["movers", window],
    queryFn: () => fetchJson(`/api/movers?window=${window}`),
    refetchInterval: 60_000,
  });
  const d = q.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Movers</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Top 30 gainers and losers across windows. Filtered to mcap ≥ $100M.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      <div className="flex flex-wrap gap-1">
        {WINDOWS.map((w) => (
          <button key={w} onClick={() => setWindow(w)} className={cn(
            "rounded-md border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors",
            window === w ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
          )}>{w}</button>
        ))}
      </div>

      <Tabs defaultValue="gainers">
        <TabsList>
          <TabsTrigger value="gainers"><TrendingUp className="mr-2 h-3 w-3 text-success" />Gainers</TabsTrigger>
          <TabsTrigger value="losers"><TrendingDown className="mr-2 h-3 w-3 text-danger" />Losers</TabsTrigger>
        </TabsList>
        <TabsContent value="gainers">
          <Card>
            <CardHeader><CardTitle>Top {window} gainers</CardTitle></CardHeader>
            <CardContent className="p-0">
              {q.isLoading ? <div className="p-5"><TableSkeleton rows={10} /></div> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : <MoversTable items={d?.gainers ?? []} kind="gain" />}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="losers">
          <Card>
            <CardHeader><CardTitle>Top {window} losers</CardTitle></CardHeader>
            <CardContent className="p-0">
              {q.isLoading ? <div className="p-5"><TableSkeleton rows={10} /></div> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : <MoversTable items={d?.losers ?? []} kind="lose" />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

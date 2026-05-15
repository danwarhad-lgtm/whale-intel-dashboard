"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GridSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatUsdCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function heatColor(change) {
  if (change == null) return "bg-muted/30";
  if (change >= 10) return "bg-success/40 ring-1 ring-success/40";
  if (change >= 5) return "bg-success/30 ring-1 ring-success/30";
  if (change >= 2) return "bg-success/20";
  if (change >= 0) return "bg-success/10";
  if (change >= -2) return "bg-danger/10";
  if (change >= -5) return "bg-danger/20";
  if (change >= -10) return "bg-danger/30 ring-1 ring-danger/30";
  return "bg-danger/40 ring-1 ring-danger/40";
}

function tileSize(rank) {
  if (rank <= 5) return "col-span-2 row-span-2 text-xl";
  if (rank <= 15) return "col-span-2 text-base";
  return "text-sm";
}

export default function HeatmapPage() {
  const q = useQuery({ queryKey: ["heatmap-market"], queryFn: () => fetchJson("/api/market"), refetchInterval: 60_000 });
  const coins = (q.data?.data?.coins ?? []).slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Heatmap</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Top 50 by market cap. Tile size = market cap, color = 24h change.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      {q.isLoading ? <GridSkeleton count={20} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <Card>
          <CardHeader><CardTitle>Market heatmap (24h %)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid auto-rows-[80px] grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {coins.map((c, i) => {
                const change = c.price_change_percentage_24h ?? 0;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex flex-col justify-between rounded-md p-2 transition-transform hover:scale-105",
                      heatColor(change),
                      tileSize(i + 1),
                    )}
                    title={`${c.name} · ${formatUsdCompact(c.market_cap)} · ${formatPercent(change)}`}
                  >
                    <div className="font-mono text-[11px] font-bold uppercase">{c.symbol}</div>
                    <div className={cn("font-mono font-semibold tabular-nums", change >= 0 ? "text-success" : "text-danger")}>
                      {formatPercent(change)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

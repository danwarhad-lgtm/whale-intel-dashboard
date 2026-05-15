"use client";
import { useQuery } from "@tanstack/react-query";
import { Flame, TrendingUp, TrendingDown, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GridSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export default function TrendingPage() {
  const q = useQuery({
    queryKey: ["trending"],
    queryFn: () => fetchJson("/api/trending"),
    refetchInterval: 90_000,
  });

  const data = q.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Trending</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Most searched coins, NFTs and categories on CoinGecko in the last 24h.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      {q.isLoading ? <GridSkeleton count={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" /> Trending coins
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(data?.coins ?? []).map((c, i) => {
                const change = c.data?.price_change_percentage_24h?.usd ?? 0;
                const positive = change >= 0;
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                      #{i + 1}
                    </div>
                    {c.thumb ? <img src={c.thumb} alt={c.symbol} className="h-7 w-7 rounded-full" /> : null}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {c.symbol} {c.rank ? `· #${c.rank}` : ""}
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-1 font-mono text-xs tabular-nums", positive ? "text-success" : "text-danger")}>
                      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatPercent(change)}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" /> Trending NFTs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.nfts ?? []).map((n) => (
                  <div key={n.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-2.5">
                    {n.thumb ? <img src={n.thumb} alt="" className="h-8 w-8 rounded-md" /> : null}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{n.name}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{n.symbol}</div>
                    </div>
                    {typeof n.floorPriceUsd === "number" ? (
                      <span className={cn("font-mono text-xs", n.floorPriceUsd >= 0 ? "text-success" : "text-danger")}>
                        {formatPercent(n.floorPriceUsd)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trending categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.categories ?? []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-2.5">
                    <div className="text-sm font-medium">{c.name}</div>
                    {typeof c.change === "number" ? (
                      <Badge variant={c.change >= 0 ? "success" : "danger"}>{formatPercent(c.change)}</Badge>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

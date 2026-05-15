"use client";
import { useQuery } from "@tanstack/react-query";
import { Tags } from "lucide-react";
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

export default function CategoriesPage() {
  const q = useQuery({ queryKey: ["categories"], queryFn: () => fetchJson("/api/categories"), refetchInterval: 5 * 60_000 });
  const items = q.data?.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Categories</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Crypto sectors ranked by market cap with 24h flow.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      {q.isLoading ? <GridSkeleton count={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Tags className="h-4 w-4 text-primary" /> All categories</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => {
              const mcChange = c.marketCapChange24h ?? 0;
              const positive = mcChange >= 0;
              return (
                <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/50 p-3 transition-colors hover:border-primary/30">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="font-mono text-[11px] tabular-nums text-muted-foreground">{formatUsdCompact(c.marketCap)} mcap · {formatUsdCompact(c.volume24h)} vol</div>
                    <div className="mt-1.5 flex -space-x-1.5">
                      {(c.top3Coins ?? []).slice(0, 3).map((u, i) => <img key={i} src={u} alt="" className="h-5 w-5 rounded-full ring-2 ring-card" />)}
                    </div>
                  </div>
                  <div className={cn("font-mono text-xs font-semibold tabular-nums", positive ? "text-success" : "text-danger")}>
                    {formatPercent(mcChange)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

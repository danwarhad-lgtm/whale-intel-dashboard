"use client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
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

export default function DexVolumePage() {
  const q = useQuery({ queryKey: ["dex-volume"], queryFn: () => fetchJson("/api/dex-volume"), refetchInterval: 5 * 60_000 });
  const d = q.data?.data;
  const protocols = d?.protocols ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">DEX Volume</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            DEX trading volume across protocols and chains.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      {q.isLoading ? <GridSkeleton count={4} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={TrendingUp} label="24h volume" value={formatUsdCompact(d?.total24h ?? 0)} />
            <StatCard label="7d volume" value={formatUsdCompact(d?.total7d ?? 0)} />
            <StatCard label="30d volume" value={formatUsdCompact(d?.total30d ?? 0)} />
          </div>

          <Card>
            <CardHeader><CardTitle>Top DEX protocols (24h)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Chains</th>
                      <th className="px-4 py-3 text-right">24h volume</th>
                      <th className="px-4 py-3 text-right">7d volume</th>
                      <th className="px-4 py-3 text-right">1d %</th>
                      <th className="px-4 py-3 text-right">7d %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protocols.map((p, i) => (
                      <tr key={p.name} className="border-b border-border/40 transition-colors hover:bg-accent/30">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2">{p.logo ? <img src={p.logo} alt="" className="h-5 w-5 rounded-full" /> : null}<span className="font-medium">{p.name}</span></div></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{(p.chains ?? []).slice(0, 3).join(", ")}{(p.chains ?? []).length > 3 ? ` +${p.chains.length - 3}` : ""}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatUsdCompact(p.total24h ?? 0)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatUsdCompact(p.total7d ?? 0)}</td>
                        {[p.change1d, p.change7d].map((v, idx) => (
                          <td key={idx} className={cn("px-4 py-3 text-right font-mono tabular-nums", v == null ? "text-muted-foreground" : v >= 0 ? "text-success" : "text-danger")}>
                            {v == null ? "—" : formatPercent(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

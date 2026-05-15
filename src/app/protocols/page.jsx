"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatUsdCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export default function ProtocolsPage() {
  const q = useQuery({ queryKey: ["protocols"], queryFn: () => fetchJson("/api/protocols"), refetchInterval: 5 * 60_000 });
  const [search, setSearch] = React.useState("");
  const items = (q.data?.data?.items ?? []).filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Top Protocols</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            DeFi protocols ranked by TVL with 1d/7d momentum.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> Protocols</CardTitle>
            <Input className="max-w-xs" placeholder="Search protocol or category..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {q.isLoading ? <div className="p-5"><TableSkeleton rows={10} /></div> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Chains</th>
                    <th className="px-4 py-3 text-right">TVL</th>
                    <th className="px-4 py-3 text-right">1h</th>
                    <th className="px-4 py-3 text-right">1d</th>
                    <th className="px-4 py-3 text-right">7d</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p, i) => (
                    <tr key={p.slug} className="border-b border-border/40 transition-colors hover:bg-accent/30">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2">{p.logo ? <img src={p.logo} alt="" className="h-5 w-5 rounded-full" /> : null}<a href={p.url || "#"} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary">{p.name}</a></div></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.category ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{(p.chains ?? []).slice(0, 2).join(", ")}{(p.chains ?? []).length > 2 ? ` +${p.chains.length - 2}` : ""}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{formatUsdCompact(p.tvl ?? 0)}</td>
                      {[p.change1h, p.change1d, p.change7d].map((v, idx) => (
                        <td key={idx} className={cn("px-4 py-3 text-right font-mono tabular-nums", v == null ? "text-muted-foreground" : v >= 0 ? "text-success" : "text-danger")}>
                          {v == null ? "—" : formatPercent(v)}
                        </td>
                      ))}
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

"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { GitCompare, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatUsd, formatUsdCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export default function ComparePage() {
  const q = useQuery({ queryKey: ["compare-market"], queryFn: () => fetchJson("/api/market"), refetchInterval: 60_000 });
  const coins = q.data?.data?.coins ?? [];
  const [selected, setSelected] = React.useState(["bitcoin", "ethereum", "solana"]);
  const [search, setSearch] = React.useState("");

  const items = selected.map((id) => coins.find((c) => c.id === id)).filter(Boolean);
  const candidates = coins.filter((c) =>
    !selected.includes(c.id) && (c.symbol.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 8);

  const add = (id) => setSelected((p) => p.length < 4 ? [...p, id] : p);
  const remove = (id) => setSelected((p) => p.filter((x) => x !== id));

  const metrics = [
    { key: "current_price", label: "Price", fmt: (v) => formatUsd(v ?? 0, v < 1 ? 4 : 2) },
    { key: "market_cap", label: "Market Cap", fmt: (v) => formatUsdCompact(v ?? 0) },
    { key: "total_volume", label: "Volume 24h", fmt: (v) => formatUsdCompact(v ?? 0) },
    { key: "market_cap_rank", label: "Rank", fmt: (v) => `#${v ?? "—"}` },
    { key: "price_change_percentage_24h", label: "24h %", fmt: (v) => formatPercent(v ?? 0), color: true },
    { key: "price_change_percentage_7d_in_currency", label: "7d %", fmt: (v) => formatPercent(v ?? 0), color: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Compare</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Pick up to 4 coins to compare side-by-side.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GitCompare className="h-4 w-4 text-primary" /> Selected ({selected.length}/4)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {items.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium">
                {c.image ? <img src={c.image} alt="" className="h-4 w-4 rounded-full" /> : null}
                {c.symbol.toUpperCase()}
                <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-danger"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          {selected.length < 4 ? (
            <>
              <Input placeholder="Search to add..." value={search} onChange={(e) => setSearch(e.target.value)} />
              {search ? (
                <div className="flex flex-wrap gap-2">
                  {candidates.map((c) => (
                    <button key={c.id} onClick={() => { add(c.id); setSearch(""); }} className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-2 py-1 text-xs hover:border-primary/40 hover:bg-accent/40">
                      {c.image ? <img src={c.image} alt="" className="h-4 w-4 rounded-full" /> : null}
                      {c.symbol.toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      {q.isLoading ? <CardSkeleton rows={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : items.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Metric</th>
                    {items.map((c) => (
                      <th key={c.id} className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.image ? <img src={c.image} alt="" className="h-5 w-5 rounded-full" /> : null}
                          <span className="font-mono text-xs font-bold uppercase">{c.symbol}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.key} className="border-b border-border/40">
                      <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">{m.label}</td>
                      {items.map((c) => {
                        const v = c[m.key];
                        return (
                          <td key={c.id} className={cn("px-4 py-3 text-right font-mono tabular-nums", m.color && typeof v === "number" ? (v >= 0 ? "text-success" : "text-danger") : "")}>
                            {m.fmt(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : <p className="text-sm text-muted-foreground">Select coins above to compare.</p>}
    </div>
  );
}

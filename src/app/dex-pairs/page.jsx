"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

function ageLabel(ts) {
  if (!ts) return "—";
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days < 1) return "<1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days/30)}mo`;
  return `${(days/365).toFixed(1)}y`;
}

export default function DexPairsPage() {
  const [input, setInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const q = useQuery({
    queryKey: ["dex", query],
    queryFn: () => fetchJson(`/api/dex-pairs?q=${encodeURIComponent(query)}`),
    enabled: query.length > 0,
    refetchInterval: 60_000,
  });
  const pairs = q.data?.data?.pairs ?? [];

  const submit = (e) => { e.preventDefault(); setQuery(input.trim()); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">DEX Pairs</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Live trading pairs across all chains via DexScreener.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-4 w-4 text-primary" />Search any token</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex gap-2">
            <Input placeholder="e.g. PEPE, WIF, ENA, 0x... contract address" value={input} onChange={(e) => setInput(e.target.value)} />
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Press Enter to search. Try a symbol, name, or contract address.</p>
        </CardContent>
      </Card>

      {query ? (
        <Card>
          <CardContent className="p-0">
            {q.isLoading ? <div className="p-5"><TableSkeleton rows={10} /></div> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : pairs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No pairs found for "{query}"</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Pair</th>
                      <th className="px-4 py-3">Chain · DEX</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">5m</th>
                      <th className="px-4 py-3 text-right">1h</th>
                      <th className="px-4 py-3 text-right">24h</th>
                      <th className="px-4 py-3 text-right">Liquidity</th>
                      <th className="px-4 py-3 text-right">Vol 24h</th>
                      <th className="px-4 py-3 text-right">Tx 24h</th>
                      <th className="px-4 py-3 text-right">Age</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((p) => (
                      <tr key={p.pairAddress} className="border-b border-border/40 hover:bg-accent/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.baseSymbol}/{p.quoteSymbol}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{p.baseName}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs uppercase">{p.chainId} · {p.dexId}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatUsd(p.priceUsd, p.priceUsd < 1 ? 6 : 2)}</td>
                        {[p.change5m, p.change1h, p.change24h].map((v, i) => (
                          <td key={i} className={cn("px-4 py-3 text-right font-mono tabular-nums", v == null ? "text-muted-foreground" : v >= 0 ? "text-success" : "text-danger")}>
                            {v == null ? "—" : formatPercent(v)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatUsdCompact(p.liquidity)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatUsdCompact(p.volume24h)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{p.txns24h.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{ageLabel(p.age)}</td>
                        <td className="px-4 py-3"><a href={p.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

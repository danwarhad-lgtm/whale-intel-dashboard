"use client";
import * as React from "react";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { ArrowLeft, ExternalLink, Globe, Twitter, Github, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/StatCard";
import { CardSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatUsd, formatUsdCompact, formatPercent, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

const RANGES = [
  { v: "1", l: "24h" },
  { v: "7", l: "7d" },
  { v: "30", l: "30d" },
  { v: "90", l: "90d" },
  { v: "365", l: "1y" },
  { v: "max", l: "All" },
];

export default function TokenDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [days, setDays] = React.useState("30");
  const q = useQuery({
    queryKey: ["coin", id, days],
    queryFn: () => fetchJson(`/api/coin/${id}?days=${days}`),
    refetchInterval: 60_000,
  });
  const d = q.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Button size="sm" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-3.5 w-3.5" />Back
          </Button>
          <div className="flex items-center gap-3">
            {d?.image ? <img src={d.image} alt="" className="h-10 w-10 rounded-full" /> : null}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">{d?.name ?? id}</h1>
                {d?.rank ? <Badge variant="muted">#{d.rank}</Badge> : null}
              </div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{d?.symbol ?? ""}</p>
            </div>
          </div>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      {q.isLoading ? <CardSkeleton rows={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : d ? (
        <>
          {/* Price + chart */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="font-mono text-3xl font-semibold tabular-nums text-primary">{formatUsd(d.market.price, d.market.price < 1 ? 6 : 2)}</div>
                  <div className={cn("font-mono text-sm tabular-nums", d.market.change24h >= 0 ? "text-success" : "text-danger")}>
                    {formatPercent(d.market.change24h)} 24h
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {RANGES.map((r) => (
                    <button key={r.v} onClick={() => setDays(r.v)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors",
                        days === r.v ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
                      )}>
                      {r.l}
                    </button>
                  ))}
                </div>
              </div>
              {d.chart?.prices?.length ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer>
                    <AreaChart data={d.chart.prices.map((p) => ({ ts: p.t, value: p.v }))}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="ts" tick={{ fontSize: 10, fill: "#8b94a8" }} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                      <YAxis tick={{ fontSize: 10, fill: "#8b94a8" }} tickFormatter={(v) => formatUsdCompact(v)} domain={["auto", "auto"]} />
                      <Tooltip contentStyle={{ background: "#0d1119", border: "1px solid #1c2436", borderRadius: 8 }} formatter={(v) => formatUsd(v)} labelFormatter={(v) => new Date(v).toLocaleString()} />
                      <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fill="url(#priceGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Market cap" value={formatUsdCompact(d.market.mcap)} />
            <StatCard label="Volume 24h" value={formatUsdCompact(d.market.volume24h)} />
            <StatCard label="FDV" value={d.market.fdv ? formatUsdCompact(d.market.fdv) : "—"} />
            <StatCard label="24h high" value={formatUsd(d.market.high24h, d.market.high24h < 1 ? 6 : 2)} />
            <StatCard label="24h low" value={formatUsd(d.market.low24h, d.market.low24h < 1 ? 6 : 2)} />
            <StatCard label="Rank" value={d.rank ? `#${d.rank}` : "—"} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Performance */}
            <Card>
              <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["24h", d.market.change24h],
                    ["7d", d.market.change7d],
                    ["30d", d.market.change30d],
                    ["1y", d.market.change1y],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-lg border border-border/60 bg-card/40 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                      <div className={cn("mt-1 font-mono text-lg font-semibold tabular-nums", v >= 0 ? "text-success" : "text-danger")}>
                        {formatPercent(v ?? 0)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">All-time high</div>
                    <div className="font-mono tabular-nums">{formatUsd(d.market.ath, d.market.ath < 1 ? 6 : 2)}</div>
                    <div className={cn("font-mono text-[10px] tabular-nums", d.market.athChange >= 0 ? "text-success" : "text-danger")}>
                      {formatPercent(d.market.athChange)} from ATH
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">All-time low</div>
                    <div className="font-mono tabular-nums">{formatUsd(d.market.atl, d.market.atl < 1 ? 6 : 2)}</div>
                    <div className={cn("font-mono text-[10px] tabular-nums", d.market.atlChange >= 0 ? "text-success" : "text-danger")}>
                      {formatPercent(d.market.atlChange)} from ATL
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supply */}
            <Card>
              <CardHeader><CardTitle>Supply</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Circulating</span><span className="font-mono tabular-nums">{formatNumber(d.market.circSupply)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-mono tabular-nums">{d.market.totalSupply ? formatNumber(d.market.totalSupply) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Max</span><span className="font-mono tabular-nums">{d.market.maxSupply ? formatNumber(d.market.maxSupply) : "∞"}</span></div>
                {d.market.maxSupply ? (
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">Circulating vs max</div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (d.market.circSupply / d.market.maxSupply) * 100)}%` }} />
                    </div>
                    <div className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                      {((d.market.circSupply / d.market.maxSupply) * 100).toFixed(1)}% mined
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Description + links */}
          {(d.description || Object.values(d.links ?? {}).some(Boolean)) ? (
            <Card>
              <CardHeader><CardTitle>About</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {d.description ? <p className="text-muted-foreground leading-relaxed">{d.description}</p> : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  {d.links.homepage ? <a href={d.links.homepage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-xs hover:border-primary/40"><Globe className="h-3 w-3" />Site<ExternalLink className="h-3 w-3 opacity-60" /></a> : null}
                  {d.links.twitter ? <a href={d.links.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-xs hover:border-primary/40"><Twitter className="h-3 w-3" />Twitter</a> : null}
                  {d.links.github ? <a href={d.links.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-xs hover:border-primary/40"><Github className="h-3 w-3" />GitHub</a> : null}
                  {d.links.telegram ? <a href={d.links.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-xs hover:border-primary/40"><MessageCircle className="h-3 w-3" />Telegram</a> : null}
                  {d.links.reddit ? <a href={d.links.reddit} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-xs hover:border-primary/40">Reddit</a> : null}
                  {d.links.explorer ? <a href={d.links.explorer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-xs hover:border-primary/40">Explorer<ExternalLink className="h-3 w-3 opacity-60" /></a> : null}
                </div>
                {(d.categories ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {d.categories.slice(0, 6).map((c) => <Badge key={c} variant="muted">{c}</Badge>)}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

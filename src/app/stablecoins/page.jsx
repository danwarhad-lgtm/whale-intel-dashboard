"use client";
import * as React from "react";
import { ShieldHalf, AlertTriangle, Wallet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/StatCard";
import { GridSkeleton, TableSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { useStablecoins } from "@/lib/hooks/use-stablecoins";
import { formatPercent, formatUsd, formatUsdCompact } from "@/lib/format";

const COLORS = ["#818cf8", "#22c55e", "#38bdf8", "#f59e0b", "#ec4899", "#a855f7"];

function deviationStatus(devPct) {
  const dev = Math.abs(devPct);
  if (dev <= 0.005) return "Healthy";
  if (dev <= 0.015) return "Watch";
  return "Risk";
}

function statusVariant(s) {
  if (s === "Healthy") return "success";
  if (s === "Watch") return "warning";
  return "danger";
}

export default function StablecoinsPage() {
  const stables = useStablecoins();

  const payload = stables.data?.data;
  const items = payload?.items ?? [];
  const healthScore = payload?.healthScore;
  const dominanceRows = payload?.dominance ?? [];

  const totalCap = items.reduce((acc, s) => acc + (s.marketCap || 0), 0);
  const dominance = items.map((s, i) => ({
    name: s.symbol,
    value: s.marketCap || 0,
    fill: COLORS[i % COLORS.length],
  }));
  const worst = healthScore?.worstDeviation;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stablecoin Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Peg health, supply distribution and depeg risk for major stablecoins.
          </p>
        </div>
        <DataSourceBadge
          status={stables.data?.status ?? (stables.isLoading ? "cached" : "error")}
          provider={stables.data?.provider}
          lastUpdated={stables.data?.lastUpdated}
        />
      </div>

      {stables.isLoading ? (
        <>
          <GridSkeleton count={3} />
          <TableSkeleton rows={6} />
        </>
      ) : stables.isError ? (
        <ErrorState
          title="Failed to load stablecoins"
          onRetry={() => stables.refetch()}
          retrying={stables.isFetching}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldHalf}
          title="No stablecoin data"
          description="The provider returned no stablecoins to display."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={ShieldHalf}
              label="Health Score"
              value={`${healthScore?.score ?? 0}/100`}
              hint={healthScore?.label ?? "—"}
            />
            <StatCard
              icon={AlertTriangle}
              label="Worst peg"
              value={worst?.symbol ?? "—"}
              hint={worst ? formatPercent(worst.pct * 100) : "All within band"}
            />
            <StatCard
              icon={Wallet}
              label="Total market cap"
              value={formatUsdCompact(totalCap)}
              hint={`${items.length} stables tracked`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Stablecoin peg monitor</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Symbol</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Deviation</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Market cap</th>
                        <th className="px-4 py-3 text-right">Volume 24h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((s) => {
                        const st = deviationStatus(s.pegDeviationPct);
                        const drift = Math.abs(s.pegDeviationPct ?? 0) > 0.005;
                        return (
                          <tr key={s.id} className="border-t border-border/60">
                            <td className="px-4 py-3">
                              <div className="font-medium">{s.symbol}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {s.name}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatUsd(s.price, 4)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right tabular-nums ${
                                drift ? "text-warning" : "text-muted-foreground"
                              }`}
                            >
                              {formatPercent((s.pegDeviationPct ?? 0) * 100)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={statusVariant(st)}>{st}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {s.marketCap
                                ? formatUsdCompact(s.marketCap)
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                              {s.volume24h
                                ? formatUsdCompact(s.volume24h)
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dominance</CardTitle>
              </CardHeader>
              <CardContent>
                {totalCap > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v) => formatUsdCompact(Number(v ?? 0))}
                      />
                      <Pie
                        data={dominance}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={84}
                        paddingAngle={2}
                      >
                        {dominance.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    No supply data.
                  </p>
                )}
                <ul className="mt-3 space-y-1 text-xs">
                  {dominance.map((d) => (
                    <li
                      key={d.name}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: d.fill }}
                        />
                        {d.name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {totalCap > 0
                          ? ((d.value / totalCap) * 100).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

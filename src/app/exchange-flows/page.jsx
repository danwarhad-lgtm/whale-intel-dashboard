"use client";
import * as React from "react";
import {
  Waves,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { TableSkeleton, GridSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExchangeFlows } from "@/lib/hooks/use-exchange-flows";
import { formatUsd, formatUsdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ExchangeFlowsPage() {
  const [exchange, setExchange] = React.useState("all");
  const [token, setToken] = React.useState("all");
  const [timeRange, setTimeRange] = React.useState("30d");

  const { data, isLoading, isError, refetch, isFetching } = useExchangeFlows({
    exchange,
    token,
    timeRange,
  });

  const payload = data?.data;
  const leaderboard = payload?.leaderboard ?? [];
  const byToken = payload?.byToken ?? [];
  const history = payload?.history ?? [];
  const summary = payload?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exchange Flows</h1>
          <p className="text-sm text-muted-foreground">
            Inflow vs outflow across major centralized exchanges. Simulated feed.
          </p>
        </div>
        <DataSourceBadge
          status={data?.status ?? (isLoading ? "cached" : "error")}
          provider={data?.provider}
          lastUpdated={data?.lastUpdated}
        />
      </div>

      {isLoading ? (
        <>
          <GridSkeleton count={4} />
          <TableSkeleton rows={6} />
        </>
      ) : isError ? (
        <ErrorState
          title="Failed to load exchange flows"
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={ArrowDownLeft}
              label="Total Inflow"
              value={formatUsdCompact(summary?.totalInflow ?? 0)}
              hint={`${summary?.timeRange ?? "24h"} window`}
            />
            <StatCard
              icon={ArrowUpRight}
              label="Total Outflow"
              value={formatUsdCompact(summary?.totalOutflow ?? 0)}
              hint={`${summary?.timeRange ?? "24h"} window`}
            />
            <StatCard
              icon={(summary?.netflowUsd ?? 0) >= 0 ? TrendingUp : TrendingDown}
              label="Netflow"
              value={formatUsdCompact(summary?.netflowUsd ?? 0)}
              hint={(summary?.netflowUsd ?? 0) >= 0 ? "Net withdrawal (bullish)" : "Net deposit (bearish)"}
            />
            <StatCard
              icon={Waves}
              label="Tx Count"
              value={(summary?.txCount ?? 0).toLocaleString()}
              hint="Across exchanges"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Filters</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={exchange} onValueChange={setExchange}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Exchange" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All exchanges</SelectItem>
                      <SelectItem value="Binance">Binance</SelectItem>
                      <SelectItem value="Coinbase">Coinbase</SelectItem>
                      <SelectItem value="Kraken">Kraken</SelectItem>
                      <SelectItem value="OKX">OKX</SelectItem>
                      <SelectItem value="Bybit">Bybit</SelectItem>
                      <SelectItem value="Bitfinex">Bitfinex</SelectItem>
                      <SelectItem value="KuCoin">KuCoin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={token} onValueChange={setToken}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tokens</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="SOL">SOL</SelectItem>
                      <SelectItem value="BNB">BNB</SelectItem>
                      <SelectItem value="XRP">XRP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24h</SelectItem>
                      <SelectItem value="7d">7d</SelectItem>
                      <SelectItem value="30d">30d</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="trend">
            <TabsList>
              <TabsTrigger value="trend">Trend</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="byToken">By token</TabsTrigger>
            </TabsList>

            <TabsContent value="trend">
              <Card>
                <CardHeader>
                  <CardTitle>Inflow vs outflow ({timeRange})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history.map((h) => ({
                        ts: new Date(h.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        }),
                        inflow: h.inflow / 1e9,
                        outflow: h.outflow / 1e9,
                      }))}>
                        <defs>
                          <linearGradient id="cIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="cOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(148,163,184,0.1)" />
                        <XAxis dataKey="ts" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="B" />
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            borderColor: "var(--border)",
                            borderRadius: 8,
                          }}
                          formatter={(v) => [`$${Number(v).toFixed(2)}B`]}
                        />
                        <Area
                          type="monotone"
                          dataKey="inflow"
                          stroke="#ef4444"
                          fill="url(#cIn)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="outflow"
                          stroke="#22c55e"
                          fill="url(#cOut)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3">Exchange</th>
                          <th className="px-4 py-3 text-right">Inflow</th>
                          <th className="px-4 py-3 text-right">Outflow</th>
                          <th className="px-4 py-3 text-right">Netflow</th>
                          <th className="px-4 py-3 text-right">Tx count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((row) => (
                          <tr
                            key={row.exchange}
                            className="border-t border-border/60"
                          >
                            <td className="px-4 py-3 font-medium">{row.exchange}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-danger">
                              {formatUsd(row.inflowUsd, 0)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-success">
                              {formatUsd(row.outflowUsd, 0)}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right tabular-nums",
                                row.netflowUsd >= 0
                                  ? "text-success"
                                  : "text-danger",
                              )}
                            >
                              {formatUsd(row.netflowUsd, 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {row.txCount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="byToken">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3">Exchange</th>
                          <th className="px-4 py-3">Token</th>
                          <th className="px-4 py-3 text-right">Inflow</th>
                          <th className="px-4 py-3 text-right">Outflow</th>
                          <th className="px-4 py-3 text-right">Netflow</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byToken.map((row, i) => (
                          <tr
                            key={`${row.exchange}-${row.token}-${i}`}
                            className="border-t border-border/60"
                          >
                            <td className="px-4 py-3 font-medium">{row.exchange}</td>
                            <td className="px-4 py-3">{row.token}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-danger">
                              {formatUsdCompact(row.inflowUsd)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-success">
                              {formatUsdCompact(row.outflowUsd)}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right tabular-nums",
                                row.netflowUsd >= 0
                                  ? "text-success"
                                  : "text-danger",
                              )}
                            >
                              {formatUsdCompact(row.netflowUsd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

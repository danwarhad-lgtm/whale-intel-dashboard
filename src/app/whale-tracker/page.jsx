"use client";
import * as React from "react";
import {
  Wallet,
  Filter,
  Search,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { TableSkeleton, GridSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useWhaleTransactions } from "@/lib/hooks/use-whale-transactions";
import { formatUsd, formatUsdCompact, shortenHash, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEVERITY_VARIANT = {
  info: "muted",
  low: "secondary",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const ADDR_EXPLORERS = {
  eth: "https://etherscan.io/address/",
  btc: "https://www.blockchain.com/btc/address/",
  bsc: "https://bscscan.com/address/",
  tron: "https://tronscan.org/#/address/",
  sol: "https://solscan.io/account/",
};

function addressUrl(chain, addr) {
  const base = ADDR_EXPLORERS[chain] || ADDR_EXPLORERS.eth;
  return `${base}${addr}`;
}

export default function WhaleTrackerPage() {
  const [chain, setChain] = React.useState("all");
  const [severity, setSeverity] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [minUsd, setMinUsd] = React.useState("");

  const { data, isLoading, isError, refetch, isFetching } = useWhaleTransactions({
    chain,
    severity,
    type,
    search,
    minUsd,
    page: 1,
    limit: 50,
  });

  const payload = data?.data;
  const txs = payload?.transactions ?? [];
  const summary = payload?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Whale Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Largest movements across major chains. Simulated feed for educational use.
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
          <TableSkeleton rows={8} />
        </>
      ) : isError ? (
        <ErrorState
          title="Failed to load whale transactions"
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Wallet}
              label="Total Volume"
              value={formatUsdCompact(summary?.totalVolume ?? 0)}
              hint={`${txs.length} transactions`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Critical"
              value={summary?.criticalCount ?? 0}
              hint=">$50M moves"
            />
            <StatCard
              icon={ArrowDownLeft}
              label="Exchange Deposits"
              value={summary?.exchangeDeposits ?? 0}
              hint="Inbound to CEX"
            />
            <StatCard
              icon={ArrowUpRight}
              label="Exchange Withdrawals"
              value={summary?.exchangeWithdrawals ?? 0}
              hint="Outbound from CEX"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Filters
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search hash, address, token…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={chain} onValueChange={setChain}>
                <SelectTrigger>
                  <SelectValue placeholder="Chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chains</SelectItem>
                  <SelectItem value="eth">Ethereum</SelectItem>
                  <SelectItem value="btc">Bitcoin</SelectItem>
                  <SelectItem value="bsc">BSC</SelectItem>
                  <SelectItem value="tron">Tron</SelectItem>
                  <SelectItem value="sol">Solana</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="exchange_deposit">Exchange deposit</SelectItem>
                  <SelectItem value="exchange_withdrawal">Exchange withdrawal</SelectItem>
                  <SelectItem value="mint">Mint</SelectItem>
                  <SelectItem value="burn">Burn</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Min USD (e.g. 1000000)"
                value={minUsd}
                onChange={(e) => setMinUsd(e.target.value)}
              />
            </CardContent>
          </Card>

          {txs.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No whales match these filters"
              description="Try lowering the minimum USD or clearing chain/type filters."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent whale transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-2 py-2">Time</th>
                        <th className="px-2 py-2">Severity</th>
                        <th className="px-2 py-2">Chain</th>
                        <th className="px-2 py-2">Token</th>
                        <th className="px-2 py-2">Type</th>
                        <th className="px-2 py-2">Tx</th>
                        <th className="px-2 py-2">From</th>
                        <th className="px-2 py-2">To</th>
                        <th className="px-2 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map((t) => (
                        <tr
                          key={t.id}
                          className="border-t border-border/60 align-top transition-colors hover:bg-accent/30"
                        >
                          <td className="px-2 py-2 text-xs text-muted-foreground">
                            {formatRelativeTime(t.timestamp)}
                          </td>
                          <td className="px-2 py-2">
                            <Badge variant={SEVERITY_VARIANT[t.severity]}>
                              {t.severity}
                            </Badge>
                          </td>
                          <td className="px-2 py-2 uppercase text-xs">{t.chain}</td>
                          <td className="px-2 py-2 font-medium">{t.tokenSymbol}</td>
                          <td className="px-2 py-2 text-xs text-muted-foreground">
                            {t.type.replace("_", " ")}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            <a
                              href={t.blockExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-primary hover:underline"
                              title={t.hash}
                            >
                              {shortenHash(t.hash)}
                            </a>
                          </td>
                          <td className="px-2 py-2 text-xs">
                            <a
                              href={addressUrl(t.chain, t.fromAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block hover:underline"
                              title={t.fromAddress}
                            >
                              <div className="font-medium text-foreground">{t.fromLabel}</div>
                              <div className="font-mono text-muted-foreground">
                                {shortenHash(t.fromAddress)}
                              </div>
                            </a>
                          </td>
                          <td className="px-2 py-2 text-xs">
                            <a
                              href={addressUrl(t.chain, t.toAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block hover:underline"
                              title={t.toAddress}
                            >
                              <div className="font-medium text-foreground">{t.toLabel}</div>
                              <div className="font-mono text-muted-foreground">
                                {shortenHash(t.toAddress)}
                              </div>
                            </a>
                          </td>
                          <td
                            className={cn(
                              "px-2 py-2 text-right font-medium tabular-nums",
                              t.severity === "critical" && "text-danger",
                            )}
                          >
                            {formatUsd(t.valueUsd, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

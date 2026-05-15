"use client";
import {
  Activity,
  Coins,
  ShieldHalf,
  Waves,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { GridSkeleton, CardSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { Sparkline } from "@/components/common/Sparkline";
import { Badge } from "@/components/ui/badge";
import { useMarketData } from "@/lib/hooks/use-market-data";
import { useWhaleTransactions } from "@/lib/hooks/use-whale-transactions";
import { useExchangeFlows } from "@/lib/hooks/use-exchange-flows";
import { useStablecoins } from "@/lib/hooks/use-stablecoins";
import { useApiStatus } from "@/lib/hooks/use-api-status";
import {
  calculateMarketRiskScore,
  calculateWhaleActivityScore,
  calculateExchangePressureScore,
} from "@/lib/scoring";
import { formatUsd, formatUsdCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const market = useMarketData();
  const whales = useWhaleTransactions({ limit: 50 });
  const flows = useExchangeFlows();
  const stables = useStablecoins();
  const apiStatus = useApiStatus();

  const loading =
    market.isLoading || whales.isLoading || flows.isLoading || stables.isLoading;
  const errored = market.isError && whales.isError && flows.isError;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader status="cached" provider="…" />
        <GridSkeleton count={4} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (errored) {
    return (
      <div className="space-y-6">
        <PageHeader status="error" />
        <ErrorState
          title="Failed to load dashboard"
          description="All data sources are unreachable. Try refreshing in a moment."
          onRetry={() => {
            market.refetch();
            whales.refetch();
            flows.refetch();
            stables.refetch();
          }}
        />
      </div>
    );
  }

  const marketData = market.data?.data;
  const whaleData = whales.data?.data;
  const flowData = flows.data?.data;
  const stableData = stables.data?.data;

  const btc = marketData?.coins?.find((c) => c.symbol === "btc");
  const eth = marketData?.coins?.find((c) => c.symbol === "eth");

  const whaleScore = calculateWhaleActivityScore(whaleData?.transactions ?? []);
  const exchangeScore = calculateExchangePressureScore(flowData?.leaderboard ?? []);
  const stableScore = stableData?.healthScore ?? { score: 80 };

  const risk = calculateMarketRiskScore({
    btcChange24h: btc?.price_change_percentage_24h ?? 0,
    ethChange24h: eth?.price_change_percentage_24h ?? 0,
    volumeChangePct: marketData?.global?.marketCapChange24h ?? 0,
    whaleScore: whaleScore.score,
    exchangeScore: exchangeScore.score,
    stablecoinScore: stableScore.score,
  });

  const tickers = (marketData?.coins ?? []).slice(0, 6);
  const apiPings = apiStatus.data?.data?.checks ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        status={market.data?.status}
        provider={market.data?.provider}
        lastUpdated={market.data?.lastUpdated}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Composite Risk"
          value={`${risk.score}/100`}
          hint={risk.label}
        />
        <StatCard
          icon={Wallet}
          label="Whale Volume (24h)"
          value={formatUsdCompact(whaleData?.summary?.totalVolume ?? 0)}
          hint={`${whaleData?.summary?.criticalCount ?? 0} critical`}
        />
        <StatCard
          icon={Waves}
          label="Exchange Netflow"
          value={formatUsdCompact(flowData?.summary?.netflowUsd ?? 0)}
          hint={exchangeScore.label}
        />
        <StatCard
          icon={ShieldHalf}
          label="Stablecoin Health"
          value={`${stableScore.score}/100`}
          hint={stableScore.label}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top markets
              </CardTitle>
              <Badge variant="muted">{tickers.length} tokens</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {tickers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available.</p>
            ) : (
              tickers.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                      {c.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        #{c.market_cap_rank} {c.symbol}
                      </div>
                    </div>
                  </div>
                  <div className="hidden flex-1 px-4 sm:block">
                    <Sparkline
                      data={c.sparkline_in_7d?.price ?? []}
                      color={
                        (c.price_change_percentage_24h ?? 0) >= 0
                          ? "#22c55e"
                          : "#ef4444"
                      }
                      height={32}
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium tabular-nums">
                      {formatUsd(c.current_price ?? 0, c.current_price < 1 ? 4 : 2)}
                    </div>
                    <div
                      className={cn(
                        "text-xs tabular-nums",
                        (c.price_change_percentage_24h ?? 0) >= 0
                          ? "text-success"
                          : "text-danger",
                      )}
                    >
                      {formatPercent(c.price_change_percentage_24h ?? 0)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Risk factors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risk.factors.map((f) => (
              <div key={f.name}>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{f.name}</span>
                  <span>{(f.weight * 100).toFixed(0)}% weight</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(f.contribution / 25) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              {risk.explanation}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API providers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {apiPings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Health probe pending. The Go function reports below once it pings
              all 3 APIs.
            </p>
          ) : (
            apiPings.map((p) => (
              <div
                key={p.provider}
                className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3"
              >
                <div>
                  <div className="text-sm font-medium">{p.provider}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.latencyMs ?? 0}ms · {p.message ?? ""}
                  </div>
                </div>
                <Badge
                  variant={
                    p.status === "ok"
                      ? "success"
                      : p.status === "degraded"
                      ? "warning"
                      : "danger"
                  }
                >
                  {p.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageHeader({ status, provider, lastUpdated }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Live market, whale, exchange, and stablecoin signals at a glance.
        </p>
      </div>
      <DataSourceBadge
        status={status ?? "cached"}
        provider={provider}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}

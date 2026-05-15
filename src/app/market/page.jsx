"use client";
import * as React from "react";
import Link from "next/link";
import { Coins, Search, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton, GridSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Sparkline } from "@/components/common/Sparkline";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMarketData } from "@/lib/hooks/use-market-data";
import { useTokenDetail } from "@/lib/hooks/use-token-detail";
import {
  useAddWatchlistItem,
  useRemoveWatchlistItem,
  useWatchlist,
} from "@/lib/hooks/use-watchlist";
import { formatUsd, formatUsdCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SORT_OPTIONS = [
  { value: "rank", label: "Rank" },
  { value: "marketCap", label: "Market cap" },
  { value: "price", label: "Price" },
  { value: "change24h", label: "24h change" },
  { value: "change7d", label: "7d change" },
  { value: "volume", label: "Volume" },
];

function changeColor(v) {
  if (typeof v !== "number") return "text-muted-foreground";
  return v >= 0 ? "text-success" : "text-danger";
}

export default function MarketPage() {
  const market = useMarketData();
  const watchlist = useWatchlist();
  const addItem = useAddWatchlistItem();
  const removeItem = useRemoveWatchlistItem();

  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("rank");
  const [activeSymbol, setActiveSymbol] = React.useState(null);

  const coins = market.data?.data?.coins ?? [];

  const watchedSymbols = React.useMemo(() => {
    const map = new Map();
    watchlist.items.forEach((it) => map.set(it.symbol.toLowerCase(), it.id));
    return map;
  }, [watchlist.items]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = coins;
    if (q) {
      list = list.filter(
        (c) =>
          c.symbol.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "marketCap":
          return (b.market_cap ?? 0) - (a.market_cap ?? 0);
        case "price":
          return (b.current_price ?? 0) - (a.current_price ?? 0);
        case "change24h":
          return (
            (b.price_change_percentage_24h ?? 0) -
            (a.price_change_percentage_24h ?? 0)
          );
        case "change7d":
          return (
            (b.price_change_percentage_7d_in_currency ?? 0) -
            (a.price_change_percentage_7d_in_currency ?? 0)
          );
        case "volume":
          return (b.total_volume ?? 0) - (a.total_volume ?? 0);
        case "rank":
        default:
          return (a.market_cap_rank ?? 999) - (b.market_cap_rank ?? 999);
      }
    });
    return sorted;
  }, [coins, search, sort]);

  const gainers = React.useMemo(
    () =>
      [...coins]
        .filter((c) => typeof c.price_change_percentage_24h === "number")
        .sort(
          (a, b) =>
            (b.price_change_percentage_24h ?? 0) -
            (a.price_change_percentage_24h ?? 0),
        )
        .slice(0, 5),
    [coins],
  );
  const losers = React.useMemo(
    () =>
      [...coins]
        .filter((c) => typeof c.price_change_percentage_24h === "number")
        .sort(
          (a, b) =>
            (a.price_change_percentage_24h ?? 0) -
            (b.price_change_percentage_24h ?? 0),
        )
        .slice(0, 5),
    [coins],
  );

  const onToggleWatch = (coin) => {
    const sym = coin.symbol.toLowerCase();
    const existingId = watchedSymbols.get(sym);
    if (existingId) {
      removeItem.mutate(existingId, {
        onSuccess: () => {
          watchlist.refresh();
          toast.success(`Removed ${coin.symbol.toUpperCase()} from watchlist`);
        },
        onError: () => toast.error("Failed to remove from watchlist"),
      });
    } else {
      addItem.mutate(
        {
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          coingeckoId: coin.id,
        },
        {
          onSuccess: () => {
            watchlist.refresh();
            toast.success(`Added ${coin.symbol.toUpperCase()} to watchlist`);
          },
          onError: () => toast.error("Failed to add to watchlist"),
        },
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Market</h1>
          <p className="text-sm text-muted-foreground">
            Top tokens by market cap with 7d sparkline and quick watchlist.
          </p>
        </div>
        <DataSourceBadge
          status={market.data?.status ?? (market.isLoading ? "cached" : "error")}
          provider={market.data?.provider}
          lastUpdated={market.data?.lastUpdated}
        />
      </div>

      {market.isLoading ? (
        <>
          <GridSkeleton count={2} />
          <TableSkeleton rows={10} />
        </>
      ) : market.isError ? (
        <ErrorState
          title="Failed to load market data"
          onRetry={() => market.refetch()}
          retrying={market.isFetching}
        />
      ) : coins.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="No market data"
          description="The market data provider returned no tokens."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GainerLoserCard
              title="Top gainers (24h)"
              icon={TrendingUp}
              coins={gainers}
              onSelect={(s) => setActiveSymbol(s)}
            />
            <GainerLoserCard
              title="Top losers (24h)"
              icon={TrendingDown}
              coins={losers}
              onSelect={(s) => setActiveSymbol(s)}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  Top markets
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="w-[220px] pl-9"
                      placeholder="Search symbol or name…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          Sort by {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState
                    icon={Search}
                    title="No tokens match"
                    description="Try a different search term."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Token</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">24h %</th>
                        <th className="px-4 py-3 text-right">7d %</th>
                        <th className="px-4 py-3 text-right">Market cap</th>
                        <th className="px-4 py-3 text-right">Volume 24h</th>
                        <th className="px-4 py-3">7d</th>
                        <th className="px-4 py-3 text-right" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => {
                        const watched = watchedSymbols.has(
                          c.symbol.toLowerCase(),
                        );
                        return (
                          <tr
                            key={c.id}
                            className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/30"
                            onClick={() => setActiveSymbol(c.symbol)}
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                              {c.market_cap_rank ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {c.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={c.image}
                                    alt={c.symbol}
                                    className="h-6 w-6 rounded-full"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold uppercase text-primary">
                                    {c.symbol.slice(0, 3)}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{c.name}</div>
                                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                    {c.symbol}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatUsd(
                                c.current_price ?? 0,
                                (c.current_price ?? 0) < 1 ? 4 : 2,
                              )}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right tabular-nums",
                                changeColor(c.price_change_percentage_24h),
                              )}
                            >
                              {formatPercent(
                                c.price_change_percentage_24h ?? 0,
                              )}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right tabular-nums",
                                changeColor(
                                  c.price_change_percentage_7d_in_currency,
                                ),
                              )}
                            >
                              {formatPercent(
                                c.price_change_percentage_7d_in_currency ?? 0,
                              )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatUsdCompact(c.market_cap ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                              {formatUsdCompact(c.total_volume ?? 0)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="w-24">
                                <Sparkline
                                  data={c.sparkline_in_7d?.price ?? []}
                                  color={
                                    (c.price_change_percentage_24h ?? 0) >= 0
                                      ? "#22c55e"
                                      : "#ef4444"
                                  }
                                  height={28}
                                />
                              </div>
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onToggleWatch(c)}
                                aria-label="Toggle watchlist"
                              >
                                <Star
                                  className={cn(
                                    "h-4 w-4",
                                    watched
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground",
                                  )}
                                />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <TokenDetailDialog
        symbol={activeSymbol}
        onOpenChange={(open) => {
          if (!open) setActiveSymbol(null);
        }}
      />
    </div>
  );
}

function GainerLoserCard({ title, icon: Icon, coins, onSelect }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {coins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          coins.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.symbol)}
              className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card/50 p-3 text-left transition-colors hover:bg-accent/30"
            >
              <div className="flex items-center gap-2">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image}
                    alt={c.symbol}
                    className="h-6 w-6 rounded-full"
                    loading="lazy"
                  />
                ) : null}
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {c.symbol}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm tabular-nums">
                  {formatUsd(
                    c.current_price ?? 0,
                    (c.current_price ?? 0) < 1 ? 4 : 2,
                  )}
                </div>
                <div
                  className={cn(
                    "text-xs tabular-nums",
                    changeColor(c.price_change_percentage_24h),
                  )}
                >
                  {formatPercent(c.price_change_percentage_24h ?? 0)}
                </div>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TokenDetailDialog({ symbol, onOpenChange }) {
  const detail = useTokenDetail(symbol);
  const open = Boolean(symbol);
  const data = detail.data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {data?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.image}
                alt={data.symbol}
                className="h-6 w-6 rounded-full"
              />
            ) : null}
            {data?.name ?? symbol?.toUpperCase() ?? "Token"}
            {data?.symbol ? (
              <Badge variant="muted">{data.symbol.toUpperCase()}</Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        {detail.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : detail.isError ? (
          <p className="text-sm text-danger">Failed to load token detail.</p>
        ) : data ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">
                {formatUsd(
                  data.current_price ?? 0,
                  (data.current_price ?? 0) < 1 ? 4 : 2,
                )}
              </span>
              <span
                className={cn(
                  "text-sm tabular-nums",
                  changeColor(data.price_change_percentage_24h),
                )}
              >
                {formatPercent(data.price_change_percentage_24h ?? 0)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-muted-foreground">Market cap</div>
                <div className="mt-1 font-medium tabular-nums">
                  {formatUsdCompact(data.market_cap ?? 0)}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-muted-foreground">Volume 24h</div>
                <div className="mt-1 font-medium tabular-nums">
                  {formatUsdCompact(data.total_volume ?? 0)}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-muted-foreground">Rank</div>
                <div className="mt-1 font-medium tabular-nums">
                  {data.market_cap_rank ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-muted-foreground">7d change</div>
                <div
                  className={cn(
                    "mt-1 font-medium tabular-nums",
                    changeColor(data.price_change_percentage_7d_in_currency),
                  )}
                >
                  {formatPercent(
                    data.price_change_percentage_7d_in_currency ?? 0,
                  )}
                </div>
              </div>
            </div>
            {data.sparkline_in_7d?.price?.length ? (
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="mb-2 text-xs text-muted-foreground">
                  7d trend
                </div>
                <Sparkline
                  data={data.sparkline_in_7d.price}
                  color={
                    (data.price_change_percentage_24h ?? 0) >= 0
                      ? "#22c55e"
                      : "#ef4444"
                  }
                  height={64}
                />
              </div>
            ) : null}
            <div className="pt-1 text-xs text-muted-foreground">
              <Link
                href="/watchlist"
                className="text-primary underline-offset-4 hover:underline"
              >
                Open watchlist →
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

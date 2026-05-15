"use client";
import * as React from "react";
import Link from "next/link";
import { Star, Trash2, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import {
  useWatchlist,
  useAddWatchlistItem,
  useRemoveWatchlistItem,
} from "@/lib/hooks/use-watchlist";
import { useMarketData } from "@/lib/hooks/use-market-data";
import { formatUsd, formatUsdCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function WatchlistPage() {
  const watchlist = useWatchlist();
  const market = useMarketData();
  const addItem = useAddWatchlistItem();
  const removeItem = useRemoveWatchlistItem();

  const [symbol, setSymbol] = React.useState("");
  const [name, setName] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [note, setNote] = React.useState("");

  const items = watchlist.items;

  const onSubmit = (e) => {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym) {
      toast.error("Symbol is required");
      return;
    }
    const coins = market.data?.data?.coins ?? [];
    const matched = coins.find(
      (c) => c.symbol.toLowerCase() === sym.toLowerCase(),
    );
    addItem.mutate(
      {
        symbol: sym,
        name: name.trim() || matched?.name || sym,
        coingeckoId: matched?.id,
        note: target
          ? `Target: ${target}${note ? " · " + note : ""}`
          : note || undefined,
      },
      {
        onSuccess: () => {
          watchlist.refresh();
          toast.success(`Added ${sym} to watchlist`);
          setSymbol("");
          setName("");
          setTarget("");
          setNote("");
        },
        onError: () => toast.error("Failed to add to watchlist"),
      },
    );
  };

  const onRemove = (id, sym) =>
    removeItem.mutate(id, {
      onSuccess: () => {
        watchlist.refresh();
        toast.success(`Removed ${sym} from watchlist`);
      },
      onError: () => toast.error("Failed to remove"),
    });

  const enriched = items.map((it) => {
    const targetMatch = (it.note ?? "").match(/Target:\s*([\d.]+)/i);
    const targetPrice = targetMatch ? parseFloat(targetMatch[1]) : null;
    const distance =
      targetPrice && it.price
        ? ((it.price - targetPrice) / targetPrice) * 100
        : null;
    return { ...it, targetPrice, distance };
  });

  const summary = React.useMemo(() => {
    const withChange = enriched.filter(
      (it) => typeof it.change24h === "number",
    );
    if (withChange.length === 0) return null;
    const best = withChange.reduce((a, b) =>
      (b.change24h ?? 0) > (a.change24h ?? 0) ? b : a,
    );
    const worst = withChange.reduce((a, b) =>
      (b.change24h ?? 0) < (a.change24h ?? 0) ? b : a,
    );
    const avg =
      withChange.reduce((acc, it) => acc + (it.change24h ?? 0), 0) /
      withChange.length;
    return { best, worst, avg };
  }, [enriched]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Watchlist</h1>
          <p className="text-sm text-muted-foreground">
            Track tokens you care about with price targets and notes.
          </p>
        </div>
        <DataSourceBadge
          status={market.data?.status ?? (market.isLoading ? "cached" : "error")}
          provider={market.data?.provider}
          lastUpdated={market.data?.lastUpdated}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add token
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-3 md:grid-cols-5"
          >
            <div className="space-y-1">
              <Label htmlFor="wl-symbol">Symbol</Label>
              <Input
                id="wl-symbol"
                placeholder="BTC"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wl-name">Name (optional)</Label>
              <Input
                id="wl-name"
                placeholder="Bitcoin"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wl-target">Target price (USD)</Label>
              <Input
                id="wl-target"
                type="number"
                step="0.0001"
                placeholder="65000"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label htmlFor="wl-note">Note</Label>
              <Input
                id="wl-note"
                placeholder="Watching breakout"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                disabled={addItem.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            label="Best 24h"
            value={summary.best.symbol}
            hint={formatPercent(summary.best.change24h ?? 0)}
            trend={summary.best.change24h}
          />
          <StatCard
            icon={TrendingDown}
            label="Worst 24h"
            value={summary.worst.symbol}
            hint={formatPercent(summary.worst.change24h ?? 0)}
            trend={summary.worst.change24h}
          />
          <StatCard
            icon={Star}
            label="Avg 24h"
            value={formatPercent(summary.avg)}
            hint={`${enriched.length} tokens`}
            trend={summary.avg}
          />
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Your watchlist is empty"
          description="Add tokens above, or browse the market to star tokens you want to track."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/market">Browse market</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tracked tokens</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">24h %</th>
                    <th className="px-4 py-3 text-right">Target</th>
                    <th className="px-4 py-3 text-right">Distance</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((it) => (
                    <tr key={it.id} className="border-t border-border/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {it.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.image}
                              alt={it.symbol}
                              className="h-5 w-5 rounded-full"
                              loading="lazy"
                            />
                          ) : null}
                          <span className="font-medium">{it.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {it.name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {it.price != null
                          ? formatUsd(it.price, it.price < 1 ? 4 : 2)
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums",
                          (it.change24h ?? 0) >= 0
                            ? "text-success"
                            : "text-danger",
                          it.change24h == null && "text-muted-foreground",
                        )}
                      >
                        {it.change24h != null
                          ? formatPercent(it.change24h)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {it.targetPrice != null
                          ? formatUsd(
                              it.targetPrice,
                              it.targetPrice < 1 ? 4 : 2,
                            )
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums",
                          it.distance != null && it.distance >= 0
                            ? "text-success"
                            : "text-danger",
                          it.distance == null && "text-muted-foreground",
                        )}
                      >
                        {it.distance != null
                          ? formatPercent(it.distance)
                          : "—"}
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-xs text-muted-foreground">
                        <span className="line-clamp-2">{it.note || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(it.id, it.symbol)}
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border/60 p-3 text-right text-[11px] text-muted-foreground">
              Showing {items.length} item{items.length === 1 ? "" : "s"} ·
              persisted in localStorage
            </div>
          </CardContent>
        </Card>
      )}

      {market.isError ? (
        <Badge variant="warning">
          Market data unavailable — prices may be stale
        </Badge>
      ) : null}
    </div>
  );
}

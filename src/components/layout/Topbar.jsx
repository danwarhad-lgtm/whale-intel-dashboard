"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  RefreshCcw,
  Search,
  Sun,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarketData } from "@/lib/hooks/use-market-data";
import { useSettings, useUpdateSetting } from "@/lib/hooks/use-settings";
import { formatUsdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Topbar({ onOpenSidebar }) {
  const market = useMarketData();
  const settings = useSettings();
  const updateSetting = useUpdateSetting();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef(null);

  const dataPayload = market.data?.data;
  const top = dataPayload?.coins?.slice(0, 2) ?? [];
  const btc = top.find((c) => c.symbol === "btc") ?? top[0] ?? null;
  const eth = top.find((c) => c.symbol === "eth") ?? top[1] ?? null;
  const marketCap = dataPayload?.global?.totalMarketCap ?? 0;
  const status = market.data?.status ?? "error";
  const loading = market.isLoading;

  const theme = settings.theme ?? "dark";

  const refreshAll = React.useCallback(async () => {
    try {
      await fetch("/api/refresh", { method: "POST" });
    } catch {
      /* ignore */
    }
    qc.invalidateQueries();
  }, [qc]);

  const toggleTheme = React.useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    updateSetting.mutate({ key: "theme", value: next });
  }, [theme, updateSetting]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === "r" && e.altKey) {
        e.preventDefault();
        refreshAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refreshAll]);

  const statusDot =
    status === "live" ? "live" : status === "error" ? "error" : "cached";
  const statusText =
    status === "live" ? "LIVE" : status === "error" ? "OFFLINE" : "CACHED";

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative w-full max-w-md flex-1 lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tokens, wallets, tx…"
          className="pl-9 pr-12"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
          /
        </kbd>
      </div>

      <div className="hidden flex-1 items-center gap-2 md:flex">
        <PriceTicker label="BTC" coin={btc} loading={loading} />
        <PriceTicker label="ETH" coin={eth} loading={loading} />
        <div className="hidden items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-xs xl:flex">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            MCAP
          </span>
          <span className="font-mono font-medium tabular-nums">
            {formatUsdCompact(marketCap)}
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5">
          <span className={`status-dot ${statusDot}`} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {statusText}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={refreshAll}
          disabled={loading}
          aria-label="Refresh"
        >
          <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>
    </header>
  );
}

function PriceTicker({ label, coin, loading }) {
  const price = coin?.current_price ?? null;
  const change = coin?.price_change_percentage_24h ?? null;
  const isUp = typeof change === "number" && change >= 0;
  const trendColor = isUp ? "text-success" : "text-danger";
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-xs">
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono font-medium tabular-nums">
        {loading && price === null
          ? "—"
          : `$${price >= 1000 ? formatUsdCompact(price).replace("$", "") : price?.toFixed(2)}`}
      </span>
      {typeof change === "number" ? (
        <span
          className={cn(
            "flex items-center gap-0.5 font-mono text-[10px] font-medium tabular-nums",
            trendColor,
          )}
        >
          <TrendIcon className="h-2.5 w-2.5" />
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      ) : null}
    </div>
  );
}

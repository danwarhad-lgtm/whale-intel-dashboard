"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, Moon, RefreshCcw, Search, Sun, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMarketData } from "@/lib/hooks/use-market-data";
import { useSettings, useUpdateSetting } from "@/lib/hooks/use-settings";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
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
  const provider = market.data?.provider;
  const lastUpdated = market.data?.lastUpdated;
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

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-6">
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
          placeholder="Search tokens, wallets, tx…  ( / )"
          className="pl-9"
        />
      </div>

      <div className="hidden flex-1 items-center gap-3 md:flex">
        <PriceTicker label="BTC" coin={btc} loading={loading} />
        <PriceTicker label="ETH" coin={eth} loading={loading} />
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-1.5 text-xs xl:flex">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Mcap</span>
          <span className="font-medium tabular-nums">
            {formatUsdCompact(marketCap)}
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DataSourceBadge
          status={status}
          provider={provider}
          lastUpdated={lastUpdated}
        />
        <Badge variant={status === "live" ? "success" : "warning"}>
          {status === "live" ? "Live" : "Demo"}
        </Badge>
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
  const trendColor =
    typeof change === "number"
      ? change >= 0
        ? "text-success"
        : "text-danger"
      : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">
        {loading && price === null ? "…" : formatUsdCompact(price ?? 0)}
      </span>
      {typeof change === "number" ? (
        <span className={cn("text-[11px] tabular-nums", trendColor)}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      ) : null}
    </div>
  );
}

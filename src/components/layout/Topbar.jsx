"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Keyboard,
  X,
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
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const searchRef = React.useRef(null);
  const wrapRef = React.useRef(null);

  const dataPayload = market.data?.data;
  const coins = dataPayload?.coins ?? [];
  const top = coins.slice(0, 2);
  const btc = top.find((c) => c.symbol === "btc") ?? top[0] ?? null;
  const eth = top.find((c) => c.symbol === "eth") ?? top[1] ?? null;
  const marketCap = dataPayload?.global?.totalMarketCap ?? 0;
  const status = market.data?.status ?? "error";
  const loading = market.isLoading;

  const theme = settings.theme ?? "dark";

  const matches = React.useMemo(() => {
    if (!search) return [];
    const s = search.toLowerCase();
    return coins.filter((c) =>
      c.symbol.toLowerCase().includes(s) || c.name.toLowerCase().includes(s)
    ).slice(0, 8);
  }, [search, coins]);

  const refreshAll = React.useCallback(async () => {
    try { await fetch("/api/refresh", { method: "POST" }); } catch {}
    qc.invalidateQueries();
  }, [qc]);

  const toggleTheme = React.useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    updateSetting.mutate({ key: "theme", value: next });
  }, [theme, updateSetting]);

  const goto = (path) => {
    setOpen(false);
    setSearch("");
    router.push(path);
  };

  React.useEffect(() => {
    const onKey = (e) => {
      const inField = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "?" && !inField) {
        e.preventDefault();
        setHelpOpen((p) => !p);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setHelpOpen(false);
      }
      if (e.key.toLowerCase() === "r" && e.altKey) {
        e.preventDefault();
        refreshAll();
      }
      // quick nav
      if (e.altKey && !inField) {
        const map = { d: "/", w: "/whale-tracker", m: "/market", a: "/alerts", s: "/settings", n: "/news", g: "/gas", t: "/trending" };
        if (map[e.key.toLowerCase()]) { e.preventDefault(); router.push(map[e.key.toLowerCase()]); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refreshAll, router]);

  React.useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    if (matches[0]) goto(`/token/${matches[0].id}`);
    else if (search.trim()) goto(`/dex-pairs?q=${encodeURIComponent(search.trim())}`);
  };

  const statusDot = status === "live" ? "live" : status === "error" ? "error" : "cached";
  const statusText = status === "live" ? "LIVE" : status === "error" ? "OFFLINE" : "CACHED";

  return (
    <>
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

      <div ref={wrapRef} className="relative w-full max-w-md flex-1 lg:max-w-sm">
        <form onSubmit={onSubmit}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search tokens, wallets, tx…"
            className="pl-9 pr-12"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
            /
          </kbd>
        </form>
        {open && search ? (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-border/60 bg-card/95 shadow-xl backdrop-blur">
            {matches.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-1">
                {matches.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/token/${c.id}`}
                      onClick={() => { setOpen(false); setSearch(""); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40"
                    >
                      {c.image ? <img src={c.image} alt="" className="h-5 w-5 rounded-full" /> : null}
                      <span className="font-medium">{c.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.symbol}</span>
                      {c.market_cap_rank ? <span className="ml-auto font-mono text-[10px] text-muted-foreground">#{c.market_cap_rank}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-3 text-xs text-muted-foreground">No coin matched. Press <kbd className="rounded border border-border bg-muted/60 px-1 font-mono">Enter</kbd> to search DEX pairs.</div>
            )}
          </div>
        ) : null}
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
        <Button variant="outline" size="icon" onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts">
          <Keyboard className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={refreshAll} disabled={loading} aria-label="Refresh">
          <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>
    </header>

    {helpOpen ? <ShortcutsPanel onClose={() => setHelpOpen(false)} /> : null}
    </>
  );
}

function ShortcutsPanel({ onClose }) {
  const groups = [
    { title: "Navigation", items: [
      ["Alt + D", "Overview"],
      ["Alt + W", "Whale Tracker"],
      ["Alt + M", "Market"],
      ["Alt + T", "Trending"],
      ["Alt + A", "Alerts"],
      ["Alt + N", "News"],
      ["Alt + G", "Gas Tracker"],
      ["Alt + S", "Settings"],
    ]},
    { title: "General", items: [
      ["/", "Focus search"],
      ["?", "Toggle this panel"],
      ["Esc", "Close panel"],
      ["Alt + R", "Refresh data"],
    ]},
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="m-4 w-full max-w-lg rounded-xl border border-border/60 bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent/40 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{g.title}</div>
              <ul className="space-y-1.5">
                {g.items.map(([k, l]) => (
                  <li key={k} className="flex items-center justify-between text-sm">
                    <span>{l}</span>
                    <kbd className="rounded border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-medium text-foreground">{k}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
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

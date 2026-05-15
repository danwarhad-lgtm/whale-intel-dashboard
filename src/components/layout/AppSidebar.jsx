"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Coins,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldHalf,
  Star,
  Waves,
  Wallet,
  Flame,
  Grid3x3,
  Gauge,
  Layers,
  Boxes,
  Percent,
  ArrowLeftRight,
  TrendingUp,
  Tags,
  GitCompare,
  Calculator,
  Newspaper,
  Fuel,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  // Intel
  { href: "/", label: "Overview", icon: LayoutDashboard, group: "intel" },
  { href: "/whale-tracker", label: "Whale Tracker", icon: Wallet, group: "intel" },
  { href: "/exchange-flows", label: "Exchange Flows", icon: Waves, group: "intel" },
  { href: "/stablecoins", label: "Stablecoins", icon: ShieldHalf, group: "intel" },
  { href: "/market", label: "Market", icon: Coins, group: "intel" },
  { href: "/trending", label: "Trending", icon: Flame, group: "intel" },
  { href: "/heatmap", label: "Heatmap", icon: Grid3x3, group: "intel" },
  { href: "/fear-greed", label: "Fear & Greed", icon: Gauge, group: "intel" },

  // DeFi
  { href: "/tvl", label: "TVL Monitor", icon: Layers, group: "defi" },
  { href: "/protocols", label: "Top Protocols", icon: Boxes, group: "defi" },
  { href: "/yields", label: "Yields", icon: Percent, group: "defi" },
  { href: "/dex-volume", label: "DEX Volume", icon: TrendingUp, group: "defi" },
  { href: "/categories", label: "Categories", icon: Tags, group: "defi" },

  // Workspace
  { href: "/alerts", label: "Alerts", icon: Bell, group: "workspace" },
  { href: "/watchlist", label: "Watchlist", icon: Star, group: "workspace" },
  { href: "/reports", label: "Reports", icon: FileText, group: "workspace" },
  { href: "/compare", label: "Compare", icon: GitCompare, group: "workspace" },
  { href: "/calculator", label: "Calculator", icon: Calculator, group: "workspace" },
  { href: "/news", label: "News", icon: Newspaper, group: "workspace" },
  { href: "/gas", label: "Gas Tracker", icon: Fuel, group: "workspace" },

  // System
  { href: "/glossary", label: "Glossary", icon: BookOpen, group: "system" },
  { href: "/settings", label: "Settings", icon: Settings, group: "system" },
];

const GROUP_LABEL = {
  intel: "Intel",
  defi: "DeFi",
  workspace: "Workspace",
  system: "System",
};

export function SidebarContent({ onNavigate }) {
  const pathname = usePathname();
  const grouped = NAV_ITEMS.reduce((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-4 scrollbar-thin">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/40"
      >
        <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-primary/30">
          <Activity className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
        </div>
        <div className="leading-tight">
          <div className="font-mono text-sm font-bold tracking-tight">
            CryptoWhale
          </div>
          <div className="text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Polyglot · v2.0
          </div>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-3">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              {GROUP_LABEL[group]}
            </div>
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                    active
                      ? "bg-primary/10 font-medium text-primary shadow-[inset_2px_0_0_0_var(--primary)]"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform",
                      active ? "" : "group-hover:scale-110",
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {active ? (
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary text-primary" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-2 rounded-xl border border-border/60 bg-gradient-to-br from-secondary/60 to-secondary/20 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Disclaimer
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Educational use only. Not financial advice.
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/40 backdrop-blur-sm lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent />
      </div>
    </aside>
  );
}

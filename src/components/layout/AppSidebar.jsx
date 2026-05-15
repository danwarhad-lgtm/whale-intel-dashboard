"use client";
import * as React from "react";
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
  Layers,
  Boxes,
  Percent,
  TrendingUp,
  Tags,
  Flame,
  Grid3x3,
  Gauge,
  GitCompare,
  Calculator,
  Newspaper,
  Fuel,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups = [
  {
    id: "intel",
    label: "Intel",
    icon: Activity,
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/whale-tracker", label: "Whale Tracker", icon: Waves },
      { href: "/exchange-flows", label: "Exchange Flows", icon: Activity },
      { href: "/stablecoins", label: "Stablecoins", icon: Coins },
      { href: "/market", label: "Market", icon: ShieldHalf },
      { href: "/trending", label: "Trending", icon: Flame },
      { href: "/heatmap", label: "Heatmap", icon: Grid3x3 },
      { href: "/fear-greed", label: "Fear & Greed", icon: Gauge },
    ],
  },
  {
    id: "defi",
    label: "DeFi",
    icon: Layers,
    items: [
      { href: "/tvl", label: "TVL Monitor", icon: Layers },
      { href: "/protocols", label: "Top Protocols", icon: Boxes },
      { href: "/yields", label: "Yields", icon: Percent },
      { href: "/dex-volume", label: "DEX Volume", icon: TrendingUp },
      { href: "/categories", label: "Categories", icon: Tags },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Star,
    items: [
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/watchlist", label: "Watchlist", icon: Star },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/compare", label: "Compare", icon: GitCompare },
      { href: "/calculator", label: "Calculator", icon: Calculator },
      { href: "/news", label: "News", icon: Newspaper },
      { href: "/gas", label: "Gas Tracker", icon: Fuel },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Settings,
    items: [
      { href: "/glossary", label: "Glossary", icon: BookOpen },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppSidebar({ onNavigate, mobile = false }) {
  const pathname = usePathname();

  // Default open: group yang nge-cover current path
  const activeGroupId = React.useMemo(() => {
    for (const g of groups) {
      if (g.items.some((i) => i.href === pathname)) return g.id;
    }
    return groups[0].id;
  }, [pathname]);

  const [open, setOpen] = React.useState(() => ({ [activeGroupId]: true }));

  // Re-open ketika path berubah ke group lain
  React.useEffect(() => {
    setOpen((prev) => ({ ...prev, [activeGroupId]: true }));
  }, [activeGroupId]);

  const toggle = (id) => setOpen((p) => ({ ...p, [id]: !p[id] }));

  return (
    <aside className={cn(
      "h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur-md",
      mobile ? "flex" : "hidden md:flex",
    )}>
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Waves className="h-4 w-4 text-primary" />
          <span className="absolute -inset-0.5 rounded-lg bg-primary/10 blur-md" aria-hidden />
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            Whale Intel
          </span>
          <span className="text-[10px] text-muted-foreground">v0.2 · polyglot</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {groups.map((group) => {
            const isOpen = !!open[group.id];
            const isActiveGroup = group.items.some((i) => i.href === pathname);
            const GroupIcon = group.icon;
            return (
              <li key={group.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggle(group.id)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-md px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                    isActiveGroup
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon className={cn("h-3.5 w-3.5", isActiveGroup ? "text-primary" : "text-muted-foreground/70")} />
                    {group.label}
                    <span className="text-[9px] font-normal tracking-normal text-muted-foreground/60">
                      {group.items.length}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isOpen ? "rotate-0 text-foreground" : "-rotate-90 text-muted-foreground/60",
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "grid transition-all duration-200 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <ul className="ml-2 overflow-hidden border-l border-border/40 pl-2">
                    {group.items.map((item) => {
                      const active = pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => onNavigate?.()}
                            className={cn(
                              "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all",
                              active
                                ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(129,140,248,0.18)]"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 transition-colors",
                                active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground",
                              )}
                            />
                            <span className="truncate">{item.label}</span>
                            {active ? (
                              <span className="ml-auto h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border/60 p-3">
        <div className="rounded-lg border border-border/60 bg-card/60 p-3">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-success">Live feed</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

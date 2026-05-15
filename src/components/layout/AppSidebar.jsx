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
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, group: "main" },
  { href: "/whale-tracker", label: "Whale Tracker", icon: Wallet, group: "main" },
  { href: "/exchange-flows", label: "Exchange Flows", icon: Waves, group: "main" },
  { href: "/stablecoins", label: "Stablecoins", icon: ShieldHalf, group: "main" },
  { href: "/market", label: "Market", icon: Coins, group: "main" },
  { href: "/alerts", label: "Alerts", icon: Bell, group: "tools" },
  { href: "/watchlist", label: "Watchlist", icon: Star, group: "tools" },
  { href: "/reports", label: "Reports", icon: FileText, group: "tools" },
  { href: "/settings", label: "Settings", icon: Settings, group: "tools" },
];

const GROUP_LABEL = {
  main: "Intel",
  tools: "Workspace",
};

export function SidebarContent({ onNavigate }) {
  const pathname = usePathname();
  const grouped = NAV_ITEMS.reduce((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col gap-2 p-4">
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
            Polyglot · v1.0
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
                  <span className="flex-1">{item.label}</span>
                  {active ? (
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary text-primary" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-secondary/60 to-secondary/20 p-3">
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
      <div className="sticky top-0">
        <SidebarContent />
      </div>
    </aside>
  );
}

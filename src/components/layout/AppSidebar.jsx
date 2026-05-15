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
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/whale-tracker", label: "Whale Tracker", icon: Wallet },
  { href: "/exchange-flows", label: "Exchange Flows", icon: Waves },
  { href: "/stablecoins", label: "Stablecoins", icon: ShieldHalf },
  { href: "/market", label: "Market", icon: Coins },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarContent({ onNavigate }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-1 p-4">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-4 flex items-center gap-2 px-2"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
          <Activity className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">CryptoWhale</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Polyglot Terminal
          </div>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {active ? (
                <span className="pulse-dot ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
        Educational use only. Not financial advice.
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card/60 lg:block">
      <SidebarContent />
    </aside>
  );
}

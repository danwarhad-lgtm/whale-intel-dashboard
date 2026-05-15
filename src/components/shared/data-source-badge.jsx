"use client";
import { Activity, CircleDashed, Database, Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_META = {
  live: { label: "Live", variant: "success", Icon: Activity },
  cached: { label: "Cached", variant: "info", Icon: Database },
  fallback: { label: "Fallback", variant: "warning", Icon: CircleDashed },
  simulated: { label: "Simulated", variant: "secondary", Icon: Sparkles },
  error: { label: "Error", variant: "danger", Icon: AlertTriangle },
};

export function DataSourceBadge({ status, provider, lastUpdated, className }) {
  const meta = STATUS_META[status] ?? STATUS_META.error;
  const Icon = meta.Icon;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-2.5 py-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      <Badge variant={meta.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {meta.label}
      </Badge>
      {provider ? <span className="hidden sm:inline">{provider}</span> : null}
      {lastUpdated ? (
        <span className="hidden md:inline">{formatRelativeTime(lastUpdated)}</span>
      ) : null}
    </div>
  );
}

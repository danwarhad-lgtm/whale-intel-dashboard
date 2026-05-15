"use client";
import { Activity, CircleDashed, Database, Sparkles, AlertTriangle } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_META = {
  live: { label: "LIVE", dotColor: "bg-success shadow-[0_0_8px_var(--success)]", textColor: "text-success", Icon: Activity },
  cached: { label: "CACHED", dotColor: "bg-info shadow-[0_0_8px_var(--info)]", textColor: "text-info", Icon: Database },
  fallback: { label: "FALLBACK", dotColor: "bg-warning shadow-[0_0_8px_var(--warning)]", textColor: "text-warning", Icon: CircleDashed },
  simulated: { label: "SIM", dotColor: "bg-muted-foreground", textColor: "text-muted-foreground", Icon: Sparkles },
  error: { label: "ERROR", dotColor: "bg-danger shadow-[0_0_8px_var(--danger)]", textColor: "text-danger", Icon: AlertTriangle },
};

export function DataSourceBadge({ status, provider, lastUpdated, className }) {
  const meta = STATUS_META[status] ?? STATUS_META.error;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 backdrop-blur-sm",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotColor)} />
      <span className={cn("font-mono text-[10px] font-bold uppercase tracking-[0.15em]", meta.textColor)}>
        {meta.label}
      </span>
      {provider ? (
        <>
          <span className="h-3 w-px bg-border/60" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {provider}
          </span>
        </>
      ) : null}
      {lastUpdated ? (
        <>
          <span className="hidden h-3 w-px bg-border/60 sm:inline-block" />
          <span className="hidden font-mono text-[10px] tabular-nums text-muted-foreground/80 sm:inline">
            {formatRelativeTime(lastUpdated)}
          </span>
        </>
      ) : null}
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}) {
  const isUp = typeof trend === "number" && trend > 0;
  const isDown = typeof trend === "number" && trend < 0;
  const trendColor = isUp
    ? "text-success"
    : isDown
      ? "text-danger"
      : "text-muted-foreground";
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : null;

  return (
    <Card className={cn("group relative overflow-hidden", className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1.5">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </div>
          {hint ? (
            <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
              {TrendIcon ? <TrendIcon className="h-3 w-3" /> : null}
              <span className="tabular-nums">{hint}</span>
            </div>
          ) : null}
        </div>
        {Icon ? (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

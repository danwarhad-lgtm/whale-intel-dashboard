import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}) {
  const trendColor =
    typeof trend === "number"
      ? trend > 0
        ? "text-success"
        : trend < 0
        ? "text-danger"
        : "text-muted-foreground"
      : "text-muted-foreground";
  return (
    <Card className={cn("glow-card", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-xl font-semibold tabular-nums">{value}</div>
          {hint ? (
            <div className={cn("text-xs", trendColor)}>{hint}</div>
          ) : null}
        </div>
        {Icon ? (
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

import { cn } from "@/lib/utils";

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-md bg-muted",
        className,
      )}
    />
  );
}

export function CardSkeleton({ className, rows = 3 }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-4 h-8 w-2/3" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} rows={2} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Skeleton className="mb-4 h-5 w-1/4" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

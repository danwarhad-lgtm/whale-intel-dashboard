"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retrying = false,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-danger/40 bg-danger/5 p-10 text-center ${className}`}
    >
      <div className="grid h-10 w-10 place-items-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="max-w-md text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

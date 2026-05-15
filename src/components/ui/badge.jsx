import * as React from "react";
import { cn } from "@/lib/utils";

const variantClasses = {
  default: "border-primary/30 bg-primary/10 text-primary",
  secondary: "border-border bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  info: "border-info/30 bg-info/10 text-info",
  muted: "border-border/60 bg-muted/40 text-muted-foreground",
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
        variantClasses[variant] ?? variantClasses.default,
        className,
      )}
      {...props}
    />
  );
}

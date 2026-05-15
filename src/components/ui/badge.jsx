import * as React from "react";
import { cn } from "@/lib/utils";

const variantClasses = {
  default: "border-transparent bg-primary/15 text-primary",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  danger: "border-transparent bg-danger/15 text-danger",
  info: "border-transparent bg-info/15 text-info",
  muted: "border-transparent bg-muted text-muted-foreground",
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        variantClasses[variant] ?? variantClasses.default,
        className,
      )}
      {...props}
    />
  );
}

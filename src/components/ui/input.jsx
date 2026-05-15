import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef(function Input(
  { className, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-border/60 bg-card/40 px-3 py-1 text-sm text-foreground transition-all placeholder:text-muted-foreground/70 hover:border-border focus-visible:border-primary/50 focus-visible:bg-card/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

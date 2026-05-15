"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const variantClasses = {
  default:
    "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(129,140,248,0.4),0_4px_16px_-4px_var(--glow-primary)] hover:bg-primary/90 hover:shadow-[0_0_0_1px_rgba(129,140,248,0.6),0_6px_20px_-4px_var(--glow-primary)]",
  secondary:
    "border border-border/60 bg-secondary text-secondary-foreground hover:border-primary/30 hover:bg-secondary/80",
  outline:
    "border border-border/60 bg-card/30 hover:border-primary/40 hover:bg-accent/40 hover:text-accent-foreground",
  ghost: "hover:bg-accent/40 hover:text-accent-foreground",
  destructive:
    "bg-destructive text-destructive-foreground shadow-[0_4px_16px_-4px_var(--glow-danger)] hover:bg-destructive/90",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClasses = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-10 px-6 text-base",
  icon: "h-9 w-9 p-0",
};

export const Button = React.forwardRef(function Button(
  { className, variant = "default", size = "default", asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant] ?? variantClasses.default,
        sizeClasses[size] ?? sizeClasses.default,
        className,
      )}
      {...props}
    />
  );
});

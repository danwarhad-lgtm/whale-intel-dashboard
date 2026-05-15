"use client";
import * as React from "react";
import { AppSidebar, SidebarContent } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

export function AppShell({ children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onOpenSidebar={() => setOpen(true)} />
        <main className="relative flex-1 px-4 py-5 lg:px-6 lg:py-6">
          <div
            className="terminal-grid pointer-events-none fixed inset-0 -z-10"
            aria-hidden
          />
          {children}
        </main>
        <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground lg:px-6">
          This dashboard is for educational and research purposes only. Not financial advice.
        </footer>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogContent className="left-0 top-0 max-w-xs translate-x-0 translate-y-0 rounded-none border-r p-0 lg:hidden">
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

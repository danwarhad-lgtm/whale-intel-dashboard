"use client";
import * as React from "react";
import {
  Settings as SettingsIcon,
  RefreshCw,
  Trash2,
  Activity,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { EmptyState } from "@/components/common/EmptyState";
import { useSettings } from "@/lib/hooks/use-settings";
import { useApiStatus } from "@/lib/hooks/use-api-status";
import { useClearAlerts } from "@/lib/hooks/use-alerts";
import { useRemoveWatchlistItem, useWatchlist } from "@/lib/hooks/use-watchlist";
import { setSettings as resetSettings, getWatchlist } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const APP_VERSION = "0.1.0";

const DEFAULTS = {
  theme: "dark",
  dataMode: "live",
  refreshIntervalSec: 60,
  whaleMinUsd: 1_000_000,
  enableAlertsExchange: true,
  enableAlertsWhale: true,
  enableAlertsStablecoin: true,
};

const REFRESH_OPTIONS = [
  { value: "30", label: "30 seconds" },
  { value: "60", label: "1 minute" },
  { value: "120", label: "2 minutes" },
  { value: "300", label: "5 minutes" },
];

export default function SettingsPage() {
  const settings = useSettings();
  const apiStatus = useApiStatus();
  const clearAlerts = useClearAlerts();
  const watchlist = useWatchlist();
  const removeWatch = useRemoveWatchlistItem();

  const onChangeTheme = (value) => {
    settings.update({ theme: value });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", value === "dark");
    }
    toast.success(`Theme set to ${value}`);
  };

  const onChangeDataMode = (value) => {
    settings.update({ dataMode: value });
    toast.success(`Data mode: ${value}`);
  };

  const onChangeRefresh = (value) => {
    const n = Number(value);
    if (Number.isFinite(n)) {
      settings.update({ refreshIntervalSec: n });
      toast.success(`Refresh every ${n}s`);
    }
  };

  const onChangeMinUsd = (e) => {
    const n = Number(e.target.value);
    if (Number.isFinite(n) && n >= 0) {
      settings.update({ whaleMinUsd: n });
    }
  };

  const onResetSettings = () => {
    resetSettings(DEFAULTS);
    settings.update(DEFAULTS);
    toast.success("Settings reset to defaults");
  };

  const onClearAlerts = () =>
    clearAlerts.mutate(undefined, {
      onSuccess: () => toast.success("Cleared all alerts"),
      onError: () => toast.error("Failed to clear alerts"),
    });

  const onClearWatchlist = () => {
    const items = getWatchlist();
    if (items.length === 0) {
      toast.message("Watchlist already empty");
      return;
    }
    Promise.all(
      items.map((it) => removeWatch.mutateAsync(it.id).catch(() => null)),
    ).then(() => {
      watchlist.refresh();
      toast.success("Cleared watchlist");
    });
  };

  const checks = apiStatus.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Theme, refresh cadence, data mode and local data tools.
          </p>
        </div>
        <DataSourceBadge
          status={apiStatus.data?.status ?? (apiStatus.isLoading ? "cached" : "error")}
          provider={apiStatus.data?.provider}
          lastUpdated={apiStatus.data?.lastUpdated}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-primary" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="setting-theme">Theme</Label>
                <Select
                  value={settings.theme ?? "dark"}
                  onValueChange={onChangeTheme}
                >
                  <SelectTrigger id="setting-theme">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="setting-mode">Data mode</Label>
                <Select
                  value={settings.dataMode ?? "live"}
                  onValueChange={onChangeDataMode}
                >
                  <SelectTrigger id="setting-mode">
                    <SelectValue placeholder="Data mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live (with fallbacks)</SelectItem>
                    <SelectItem value="simulated">Simulated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="setting-refresh">Refresh interval</Label>
                <Select
                  value={String(settings.refreshIntervalSec ?? 60)}
                  onValueChange={onChangeRefresh}
                >
                  <SelectTrigger id="setting-refresh">
                    <SelectValue placeholder="Refresh interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRESH_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="setting-whale">Whale threshold (USD)</Label>
                <Input
                  id="setting-whale"
                  type="number"
                  min={0}
                  value={settings.whaleMinUsd ?? 1_000_000}
                  onChange={onChangeMinUsd}
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onResetSettings}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset settings
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onClearAlerts}
                disabled={clearAlerts.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear alerts
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onClearWatchlist}
                disabled={removeWatch.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear watchlist
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                API status
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => apiStatus.refetch()}
                disabled={apiStatus.isFetching}
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    apiStatus.isFetching && "animate-spin",
                  )}
                />
                Recheck
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {apiStatus.isLoading ? (
              <p className="text-sm text-muted-foreground">Probing providers…</p>
            ) : checks.length === 0 ? (
              <EmptyState
                icon={Database}
                title="No probes available"
                description="The /api/health endpoint returned no providers."
              />
            ) : (
              checks.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{p.provider}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.latencyMs ?? 0}ms · {p.message ?? "—"}
                    </div>
                    {p.checkedAt ? (
                      <div className="text-[10px] text-muted-foreground">
                        checked {new Date(p.checkedAt).toLocaleTimeString()}
                      </div>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      p.status === "ok"
                        ? "success"
                        : p.status === "degraded"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <Badge variant="muted">v{APP_VERSION}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Build</span>
            <span className="text-xs">whale-intel-poly · Next.js 15</span>
          </div>
          <p className="pt-2 text-xs text-muted-foreground">
            This dashboard is for educational and research purposes only. Not
            financial advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

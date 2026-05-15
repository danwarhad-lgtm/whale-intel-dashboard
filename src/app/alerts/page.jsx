"use client";
import * as React from "react";
import {
  Bell,
  Trash2,
  Check,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import {
  useAlerts,
  useAddAlert,
  useDeleteAlert,
  useMarkAlertRead,
  useClearAlerts,
  useGenerateTestAlert,
} from "@/lib/hooks/use-alerts";
import { useSettings } from "@/lib/hooks/use-settings";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SEVERITY_VARIANT = {
  info: "info",
  low: "secondary",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const SEVERITIES = ["all", "critical", "high", "medium", "low", "info"];
const TYPES = [
  "all",
  "whale",
  "exchange_flow",
  "stablecoin_depeg",
  "custom",
];

export default function AlertsPage() {
  const { alerts, refresh } = useAlerts();
  const addAlert = useAddAlert();
  const deleteAlert = useDeleteAlert();
  const markRead = useMarkAlertRead();
  const clearAll = useClearAlerts();
  const generateTest = useGenerateTestAlert();
  const settings = useSettings();

  const [severity, setSeverity] = React.useState("all");
  const [type, setType] = React.useState("all");

  const filtered = React.useMemo(() => {
    return alerts.filter((a) => {
      if (severity !== "all" && a.severity !== severity) return false;
      if (type !== "all" && a.type !== type) return false;
      return true;
    });
  }, [alerts, severity, type]);

  const onGenerate = () =>
    generateTest.mutate(undefined, {
      onSuccess: () => {
        refresh();
        toast.success("Test alert generated");
      },
      onError: () => toast.error("Failed to generate alert"),
    });

  const onClear = () => {
    if (alerts.length === 0) return;
    clearAll.mutate(undefined, {
      onSuccess: () => {
        refresh();
        toast.success("Cleared all alerts");
      },
      onError: () => toast.error("Failed to clear alerts"),
    });
  };

  const onMarkRead = (id) =>
    markRead.mutate(id, {
      onSuccess: () => {
        refresh();
      },
      onError: () => toast.error("Failed to mark as read"),
    });

  const onDelete = (id) =>
    deleteAlert.mutate(id, {
      onSuccess: () => {
        refresh();
        toast.success("Alert deleted");
      },
      onError: () => toast.error("Failed to delete alert"),
    });

  const onAddCustom = () =>
    addAlert.mutate(
      {
        type: "custom",
        severity: "info",
        title: "Custom note",
        message: "Manually pinned alert from the Alerts page.",
        source: "user",
      },
      {
        onSuccess: () => {
          refresh();
          toast.success("Custom alert added");
        },
        onError: () => toast.error("Failed to add alert"),
      },
    );

  const counts = React.useMemo(() => {
    const out = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    alerts.forEach((a) => {
      if (out[a.severity] != null) out[a.severity] += 1;
    });
    return out;
  }, [alerts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Local feed of whale, exchange and stablecoin signals.
          </p>
        </div>
        <DataSourceBadge
          status="cached"
          provider="local-storage"
          lastUpdated={alerts[0]?.createdAt}
        />
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Alert feed
                  <span className="text-xs font-normal text-muted-foreground">
                    {alerts.length} total
                  </span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === "all" ? "All severities" : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "all" ? "All types" : t.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onGenerate}
                    disabled={generateTest.isPending}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddCustom}
                    disabled={addAlert.isPending}
                  >
                    Add custom
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onClear}
                    disabled={clearAll.isPending || alerts.length === 0}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear all
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(counts).map(([sev, n]) => (
                  <Badge key={sev} variant={SEVERITY_VARIANT[sev] ?? "muted"}>
                    {sev}: {n}
                  </Badge>
                ))}
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="No alerts to show"
                  description={
                    alerts.length === 0
                      ? "Click Generate test to add a sample alert, or wait for live signals."
                      : "Try clearing the severity / type filters."
                  }
                />
              ) : (
                <ul className="space-y-2">
                  {filtered.map((a) => (
                    <li
                      key={a.id}
                      className={cn(
                        "rounded-xl border border-border bg-card/60 p-4 transition-colors",
                        !a.read && "border-primary/40 bg-primary/5",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                SEVERITY_VARIANT[a.severity] ?? "muted"
                              }
                            >
                              {a.severity}
                            </Badge>
                            <Badge variant="outline">
                              {(a.type ?? "custom").replace("_", " ")}
                            </Badge>
                            {!a.read ? (
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                                New
                              </span>
                            ) : null}
                            <span className="text-[11px] text-muted-foreground">
                              {formatRelativeTime(a.createdAt)}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium">
                            {a.title}
                          </div>
                          {a.message ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {a.message}
                            </div>
                          ) : null}
                          {a.tokenSymbol || a.exchange ? (
                            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                              {a.tokenSymbol ? (
                                <span>Token: {a.tokenSymbol}</span>
                              ) : null}
                              {a.exchange ? (
                                <span>Exchange: {a.exchange}</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {!a.read ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onMarkRead(a.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Mark read
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(a.id)}
                            aria-label="Delete alert"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Alert preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-xs text-muted-foreground">
                These toggles are stored locally. Wire them up to the alert
                generators in a future iteration.
              </p>
              <SettingRow
                id="alerts-whale"
                label="Whale movement alerts"
                description="Notify on transactions above the configured threshold."
                checked={settings.enableAlertsWhale ?? true}
                onCheckedChange={(v) =>
                  settings.update({ enableAlertsWhale: v })
                }
              />
              <SettingRow
                id="alerts-exchange"
                label="Exchange flow alerts"
                description="Trigger when exchange netflow crosses major thresholds."
                checked={settings.enableAlertsExchange ?? true}
                onCheckedChange={(v) =>
                  settings.update({ enableAlertsExchange: v })
                }
              />
              <SettingRow
                id="alerts-stable"
                label="Stablecoin depeg alerts"
                description="Watch for peg deviation beyond 0.5%."
                checked={settings.enableAlertsStablecoin ?? true}
                onCheckedChange={(v) =>
                  settings.update({ enableAlertsStablecoin: v })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingRow({ id, label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

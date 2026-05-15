"use client";
import * as React from "react";
import {
  Settings as SettingsIcon,
  RefreshCw,
  Trash2,
  Activity,
  Database,
  User,
  Palette,
  Bell,
  Eye,
  Shield,
  Download,
  Upload,
  Info,
  HelpCircle,
  Globe,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { setSettings as resetSettings, getWatchlist, getAlerts, getReports, STORAGE_KEYS } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const APP_VERSION = "0.2.0";

const DEFAULTS = {
  displayName: "",
  defaultCurrency: "USD",
  language: "en",
  timezone: "auto",
  theme: "dark",
  density: "comfortable",
  accentColor: "indigo",
  fontScale: 100,
  reduceMotion: false,
  showGrid: true,
  dataMode: "live",
  refreshIntervalSec: 60,
  whaleMinUsd: 1_000_000,
  preferredChain: "ethereum",
  preferredGasChain: "eth",
  pageSize: 50,
  enableAlertsExchange: true,
  enableAlertsWhale: true,
  enableAlertsStablecoin: true,
  notificationSound: false,
  alertThresholdHigh: 90,
  alertThresholdMedium: 70,
  showSparklines: true,
  showLogos: true,
  numberFormat: "compact",
  percentDecimals: 2,
  storeLocally: true,
  shareUsage: false,
};

const REFRESH_OPTIONS = [
  { value: "30", label: "30 seconds" },
  { value: "60", label: "1 minute" },
  { value: "120", label: "2 minutes" },
  { value: "300", label: "5 minutes" },
  { value: "600", label: "10 minutes" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "IDR", "BTC", "ETH"];
const LANGUAGES = [
  { v: "en", l: "English" },
  { v: "id", l: "Bahasa Indonesia" },
  { v: "es", l: "Español" },
  { v: "zh", l: "中文" },
];
const CHAINS = ["ethereum", "bsc", "polygon", "arbitrum", "base", "optimism", "avalanche", "solana", "tron"];
const GAS_CHAINS = [
  { v: "eth", l: "Ethereum" },
  { v: "bsc", l: "BNB Chain" },
  { v: "poly", l: "Polygon" },
  { v: "arb", l: "Arbitrum" },
  { v: "base", l: "Base" },
  { v: "avax", l: "Avalanche" },
];
const ACCENT_COLORS = [
  { v: "indigo", l: "Indigo", hex: "#818cf8" },
  { v: "violet", l: "Violet", hex: "#a78bfa" },
  { v: "cyan", l: "Cyan", hex: "#22d3ee" },
  { v: "emerald", l: "Emerald", hex: "#34d399" },
  { v: "rose", l: "Rose", hex: "#fb7185" },
];

function Section({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">{children}</CardContent>
    </Card>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-1">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function FieldGrid({ children }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

export default function SettingsPage() {
  const settings = useSettings();
  const apiStatus = useApiStatus();
  const clearAlerts = useClearAlerts();
  const watchlist = useWatchlist();
  const removeWatch = useRemoveWatchlistItem();

  const update = (partial, msg) => {
    settings.update(partial);
    if (msg) toast.success(msg);
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

  const onExport = () => {
    if (typeof window === "undefined") return;
    const dump = {
      exportedAt: new Date().toISOString(),
      version: APP_VERSION,
      data: {
        settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? "{}"),
        alerts: getAlerts(),
        watchlist: getWatchlist(),
        reports: getReports(),
      },
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whale-intel-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const fileRef = React.useRef(null);
  const onImportClick = () => fileRef.current?.click();
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const d = parsed.data ?? {};
      if (d.settings) localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(d.settings));
      if (Array.isArray(d.alerts)) localStorage.setItem(STORAGE_KEYS.alerts, JSON.stringify(d.alerts));
      if (Array.isArray(d.watchlist)) localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(d.watchlist));
      if (Array.isArray(d.reports)) localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(d.reports));
      toast.success("Backup imported. Reloading…");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error("Invalid backup file");
    } finally {
      e.target.value = "";
    }
  };

  const onWipeAll = () => {
    if (typeof window === "undefined") return;
    if (!confirm("This will delete all alerts, watchlist, reports, and settings. Continue?")) return;
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    toast.success("All local data wiped. Reloading…");
    setTimeout(() => window.location.reload(), 1000);
  };

  const checks = apiStatus.data?.data?.checks ?? [];

  // Storage usage
  const [storageInfo, setStorageInfo] = React.useState(null);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let total = 0;
    for (const k of Object.values(STORAGE_KEYS)) {
      const v = localStorage.getItem(k);
      if (v) total += v.length;
    }
    setStorageInfo({
      bytes: total,
      alerts: getAlerts().length,
      watchlist: getWatchlist().length,
      reports: getReports().length,
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Profile, appearance, data, alerts, privacy, backups and diagnostics.
          </p>
        </div>
        <DataSourceBadge
          status={apiStatus.data?.status ?? (apiStatus.isLoading ? "cached" : "error")}
          provider={apiStatus.data?.provider}
          lastUpdated={apiStatus.data?.lastUpdated}
        />
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="profile"><User className="mr-1.5 h-3 w-3" />Profile</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-1.5 h-3 w-3" />Appearance</TabsTrigger>
          <TabsTrigger value="data"><Database className="mr-1.5 h-3 w-3" />Data</TabsTrigger>
          <TabsTrigger value="alerts"><Bell className="mr-1.5 h-3 w-3" />Alerts</TabsTrigger>
          <TabsTrigger value="display"><Eye className="mr-1.5 h-3 w-3" />Display</TabsTrigger>
          <TabsTrigger value="privacy"><Shield className="mr-1.5 h-3 w-3" />Privacy</TabsTrigger>
          <TabsTrigger value="backup"><Download className="mr-1.5 h-3 w-3" />Backup</TabsTrigger>
          <TabsTrigger value="api"><Activity className="mr-1.5 h-3 w-3" />API</TabsTrigger>
          <TabsTrigger value="about"><Info className="mr-1.5 h-3 w-3" />About</TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile">
          <Section icon={User} title="Profile" description="Personal preferences. Stored locally only.">
            <FieldGrid>
              <div className="space-y-1">
                <Label>Display name</Label>
                <Input value={settings.displayName ?? ""} placeholder="Anonymous Trader" onChange={(e) => update({ displayName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Default currency</Label>
                <Select value={settings.defaultCurrency ?? "USD"} onValueChange={(v) => update({ defaultCurrency: v }, `Currency: ${v}`)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Language</Label>
                <Select value={settings.language ?? "en"} onValueChange={(v) => update({ language: v }, "Language updated")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Timezone</Label>
                <Select value={settings.timezone ?? "auto"} onValueChange={(v) => update({ timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (browser)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Asia/Bangkok">Asia/Bangkok</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FieldGrid>
          </Section>
        </TabsContent>

        {/* APPEARANCE */}
        <TabsContent value="appearance">
          <Section icon={Palette} title="Appearance" description="Theme, density and visual style.">
            <FieldGrid>
              <div className="space-y-1">
                <Label>Theme</Label>
                <Select value={settings.theme ?? "dark"} onValueChange={(v) => {
                  update({ theme: v }, `Theme: ${v}`);
                  if (typeof document !== "undefined") {
                    document.documentElement.classList.toggle("dark", v === "dark");
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Density</Label>
                <Select value={settings.density ?? "comfortable"} onValueChange={(v) => update({ density: v }, `Density: ${v}`)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Accent color</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.v}
                      onClick={() => update({ accentColor: c.v }, `Accent: ${c.l}`)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                        settings.accentColor === c.v
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-card/40 hover:border-primary/30",
                      )}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ background: c.hex, boxShadow: `0 0 8px ${c.hex}80` }} />
                      {c.l}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Live preview applies on next reload.</p>
              </div>
              <div className="space-y-1">
                <Label>Font scale ({settings.fontScale ?? 100}%)</Label>
                <Input type="range" min="80" max="120" step="5" value={settings.fontScale ?? 100} onChange={(e) => update({ fontScale: Number(e.target.value) })} />
              </div>
            </FieldGrid>
            <Separator />
            <Row label="Reduce motion" hint="Disable transitions, animations, ping pulses">
              <Switch checked={!!settings.reduceMotion} onCheckedChange={(v) => update({ reduceMotion: v })} />
            </Row>
            <Row label="Show terminal grid" hint="Background ambient grid lines">
              <Switch checked={settings.showGrid !== false} onCheckedChange={(v) => update({ showGrid: v })} />
            </Row>
          </Section>
        </TabsContent>

        {/* DATA */}
        <TabsContent value="data">
          <Section icon={Database} title="Data sources & refresh" description="Live API behavior, polling, default chains.">
            <FieldGrid>
              <div className="space-y-1">
                <Label>Data mode</Label>
                <Select value={settings.dataMode ?? "live"} onValueChange={(v) => update({ dataMode: v }, `Data mode: ${v}`)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live (with fallbacks)</SelectItem>
                    <SelectItem value="simulated">Simulated</SelectItem>
                    <SelectItem value="cached">Cached only (offline)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Refresh interval</Label>
                <Select value={String(settings.refreshIntervalSec ?? 60)} onValueChange={(v) => update({ refreshIntervalSec: Number(v) }, `Refresh: ${v}s`)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REFRESH_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Whale threshold (USD)</Label>
                <Input type="number" min={0} value={settings.whaleMinUsd ?? 1_000_000} onChange={(e) => update({ whaleMinUsd: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Page size (table rows)</Label>
                <Select value={String(settings.pageSize ?? 50)} onValueChange={(v) => update({ pageSize: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Default chain</Label>
                <Select value={settings.preferredChain ?? "ethereum"} onValueChange={(v) => update({ preferredChain: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHAINS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Default gas chain</Label>
                <Select value={settings.preferredGasChain ?? "eth"} onValueChange={(v) => update({ preferredGasChain: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GAS_CHAINS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </FieldGrid>
          </Section>
        </TabsContent>

        {/* ALERTS */}
        <TabsContent value="alerts">
          <Section icon={Bell} title="Alert engine" description="What to monitor and when to fire alerts.">
            <Row label="Exchange flow alerts" hint="Big inflows/outflows across major CEX">
              <Switch checked={settings.enableAlertsExchange !== false} onCheckedChange={(v) => update({ enableAlertsExchange: v })} />
            </Row>
            <Row label="Whale movement alerts" hint="Tx > whale threshold from your watchlist">
              <Switch checked={settings.enableAlertsWhale !== false} onCheckedChange={(v) => update({ enableAlertsWhale: v })} />
            </Row>
            <Row label="Stablecoin depeg alerts" hint="Peg deviation beyond healthy band">
              <Switch checked={settings.enableAlertsStablecoin !== false} onCheckedChange={(v) => update({ enableAlertsStablecoin: v })} />
            </Row>
            <Row label="Notification sound" hint="Chime when high-severity alert fires">
              <Switch checked={!!settings.notificationSound} onCheckedChange={(v) => update({ notificationSound: v })} />
            </Row>
            <Separator />
            <FieldGrid>
              <div className="space-y-1">
                <Label>High threshold ({settings.alertThresholdHigh ?? 90})</Label>
                <Input type="range" min="50" max="100" step="5" value={settings.alertThresholdHigh ?? 90} onChange={(e) => update({ alertThresholdHigh: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Medium threshold ({settings.alertThresholdMedium ?? 70})</Label>
                <Input type="range" min="30" max="90" step="5" value={settings.alertThresholdMedium ?? 70} onChange={(e) => update({ alertThresholdMedium: Number(e.target.value) })} />
              </div>
            </FieldGrid>
            <Separator />
            <div>
              <Button variant="destructive" size="sm" onClick={onClearAlerts} disabled={clearAlerts.isPending}>
                <Trash2 className="h-3.5 w-3.5" />Clear all alerts
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* DISPLAY */}
        <TabsContent value="display">
          <Section icon={Eye} title="Display preferences" description="How numbers, charts and tables are rendered.">
            <Row label="Show sparklines in tables" hint="Mini price charts in market table">
              <Switch checked={settings.showSparklines !== false} onCheckedChange={(v) => update({ showSparklines: v })} />
            </Row>
            <Row label="Show project logos" hint="Coin and protocol icons">
              <Switch checked={settings.showLogos !== false} onCheckedChange={(v) => update({ showLogos: v })} />
            </Row>
            <Separator />
            <FieldGrid>
              <div className="space-y-1">
                <Label>Number format</Label>
                <Select value={settings.numberFormat ?? "compact"} onValueChange={(v) => update({ numberFormat: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact (1.2K, 3.4M)</SelectItem>
                    <SelectItem value="standard">Standard (1,200)</SelectItem>
                    <SelectItem value="scientific">Scientific (1.2e3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Percent decimals</Label>
                <Select value={String(settings.percentDecimals ?? 2)} onValueChange={(v) => update({ percentDecimals: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[0, 1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n} digits</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </FieldGrid>
          </Section>
        </TabsContent>

        {/* PRIVACY */}
        <TabsContent value="privacy">
          <Section icon={Shield} title="Privacy & local data" description="What stays in your browser, what gets cleared.">
            <Row label="Store data locally" hint="Watchlist, alerts, reports kept in browser localStorage">
              <Switch checked={settings.storeLocally !== false} onCheckedChange={(v) => update({ storeLocally: v })} />
            </Row>
            <Row label="Anonymous usage telemetry" hint="None enabled — this app does not phone home">
              <Switch checked={!!settings.shareUsage} disabled />
            </Row>
            <Separator />
            <div className="rounded-lg border border-border/60 bg-card/40 p-3 text-xs">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Storage usage</div>
              {storageInfo ? (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div><div className="text-muted-foreground">Bytes</div><div className="font-mono tabular-nums">{storageInfo.bytes.toLocaleString()}</div></div>
                  <div><div className="text-muted-foreground">Alerts</div><div className="font-mono tabular-nums">{storageInfo.alerts}</div></div>
                  <div><div className="text-muted-foreground">Watchlist</div><div className="font-mono tabular-nums">{storageInfo.watchlist}</div></div>
                  <div><div className="text-muted-foreground">Reports</div><div className="font-mono tabular-nums">{storageInfo.reports}</div></div>
                </div>
              ) : <p className="mt-2 text-muted-foreground">Calculating…</p>}
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" size="sm" onClick={onClearWatchlist} disabled={removeWatch.isPending}>
                <Trash2 className="h-3.5 w-3.5" />Clear watchlist
              </Button>
              <Button variant="destructive" size="sm" onClick={onWipeAll}>
                <AlertTriangle className="h-3.5 w-3.5" />Wipe all local data
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* BACKUP */}
        <TabsContent value="backup">
          <Section icon={Download} title="Backup & restore" description="Export everything to JSON, or import a previous backup.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button onClick={onExport} className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-5 text-left transition-all hover:border-primary/40 hover:bg-card/60">
                <Download className="h-5 w-5 text-primary" />
                <div className="font-semibold">Export backup</div>
                <p className="text-xs text-muted-foreground">Downloads JSON with settings, alerts, watchlist, and reports.</p>
              </button>
              <button onClick={onImportClick} className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-5 text-left transition-all hover:border-primary/40 hover:bg-card/60">
                <Upload className="h-5 w-5 text-primary" />
                <div className="font-semibold">Import backup</div>
                <p className="text-xs text-muted-foreground">Replace local data with a previous export. Page reloads after import.</p>
              </button>
              <input type="file" ref={fileRef} accept="application/json" className="hidden" onChange={onImportFile} />
            </div>
            <Separator />
            <div>
              <Button variant="outline" size="sm" onClick={onResetSettings}>
                <RefreshCw className="h-3.5 w-3.5" />Reset settings to defaults
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* API */}
        <TabsContent value="api">
          <Section icon={Activity} title="API providers" description="Live probe of external data sources used by this app.">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => apiStatus.refetch()} disabled={apiStatus.isFetching}>
                <RefreshCw className={cn("h-3.5 w-3.5", apiStatus.isFetching && "animate-spin")} />
                Recheck
              </Button>
            </div>
            {apiStatus.isLoading ? (
              <p className="text-sm text-muted-foreground">Probing providers…</p>
            ) : checks.length === 0 ? (
              <EmptyState icon={Database} title="No probes available" description="The /api/health endpoint returned no providers." />
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {checks.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
                    <div>
                      <div className="text-sm font-medium">{p.provider}</div>
                      <div className="text-[11px] text-muted-foreground">{p.latencyMs ?? 0}ms · {p.message ?? "—"}</div>
                      {p.checkedAt ? <div className="text-[10px] text-muted-foreground">checked {new Date(p.checkedAt).toLocaleTimeString()}</div> : null}
                    </div>
                    <Badge variant={p.status === "ok" ? "success" : p.status === "degraded" ? "warning" : "danger"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
          <Section icon={Zap} title="Diagnostics" description="Browser environment for support.">
            {typeof window !== "undefined" ? (
              <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2">
                  <dt className="text-muted-foreground">User agent</dt>
                  <dd className="truncate font-mono text-[10px]">{navigator.userAgent.split(" ").slice(-2).join(" ")}</dd>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2">
                  <dt className="text-muted-foreground">Language</dt>
                  <dd className="font-mono text-[10px]">{navigator.language}</dd>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2">
                  <dt className="text-muted-foreground">Cores</dt>
                  <dd className="font-mono text-[10px]">{navigator.hardwareConcurrency ?? "?"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2">
                  <dt className="text-muted-foreground">Online</dt>
                  <dd className="font-mono text-[10px]">{String(navigator.onLine)}</dd>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2">
                  <dt className="text-muted-foreground">Viewport</dt>
                  <dd className="font-mono text-[10px]">{window.innerWidth}×{window.innerHeight}</dd>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2">
                  <dt className="text-muted-foreground">Timezone</dt>
                  <dd className="font-mono text-[10px]">{Intl.DateTimeFormat().resolvedOptions().timeZone}</dd>
                </div>
              </dl>
            ) : null}
          </Section>
        </TabsContent>

        {/* ABOUT */}
        <TabsContent value="about">
          <Section icon={Info} title="About Whale Intel">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Version</span><Badge variant="muted">v{APP_VERSION}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Build</span><span className="font-mono text-xs">whale-intel-poly · Next.js 15</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Stack</span><span className="font-mono text-xs">JS · Python · Go · Bash · SQL</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Data sources</span><span className="font-mono text-xs">CoinGecko · DefiLlama · alt.me · Owlracle</span></div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2 text-xs">
              <a href="https://github.com/reupmolor-lgtm/whale-intel" target="_blank" rel="noopener noreferrer" className="rounded-md border border-border/60 bg-card/40 px-3 py-1.5 hover:border-primary/40 hover:text-primary"><Globe className="mr-1 inline h-3 w-3" />GitHub repo</a>
              <a href="/glossary" className="rounded-md border border-border/60 bg-card/40 px-3 py-1.5 hover:border-primary/40 hover:text-primary"><HelpCircle className="mr-1 inline h-3 w-3" />Glossary</a>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              This dashboard is for educational and research purposes only. Not financial advice.
            </p>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

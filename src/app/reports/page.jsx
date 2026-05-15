"use client";
import * as React from "react";
import { FileText, Plus, Trash2, Copy, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import {
  useReports,
  useGenerateReport,
  useDeleteReport,
  useClearReports,
} from "@/lib/hooks/use-reports";
import {
  formatUsd,
  formatUsdCompact,
  formatPercent,
  formatRelativeTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function reportToMarkdown(r) {
  if (!r) return "";
  const s = r.summary ?? {};
  const lines = [
    `# ${r.title}`,
    "",
    `*Generated ${new Date(r.createdAt).toLocaleString()} · period ${r.period}*`,
    "",
    "## Summary",
    "",
    `- Total whale volume: ${formatUsdCompact(s.totalWhaleVolume ?? 0)}`,
    `- Critical events: ${s.criticalCount ?? 0}`,
    `- Exchange deposits: ${s.exchangeDeposits ?? 0}`,
    `- Exchange withdrawals: ${s.exchangeWithdrawals ?? 0}`,
    `- Total inflow: ${formatUsdCompact(s.totalInflow ?? 0)}`,
    `- Total outflow: ${formatUsdCompact(s.totalOutflow ?? 0)}`,
    `- Stablecoin health: ${s.stableHealth ?? 0}/100`,
    `- BTC 24h: ${formatPercent(s.btcChange24h ?? 0)}`,
    `- ETH 24h: ${formatPercent(s.ethChange24h ?? 0)}`,
    "",
    "## Highlights",
    "",
    ...(r.highlights ?? []).map((h) => `- **${h.name}:** ${h.value}`),
    "",
    "_This dashboard is for educational and research purposes only._",
  ];
  return lines.join("\n");
}

export default function ReportsPage() {
  const { reports, refresh } = useReports();
  const generate = useGenerateReport();
  const deleteReport = useDeleteReport();
  const clearAll = useClearReports();

  const [activeId, setActiveId] = React.useState(null);

  React.useEffect(() => {
    if (!activeId && reports.length > 0) {
      setActiveId(reports[0].id);
    }
    if (activeId && !reports.find((r) => r.id === activeId)) {
      setActiveId(reports[0]?.id ?? null);
    }
  }, [reports, activeId]);

  const active = reports.find((r) => r.id === activeId) ?? null;

  const onGenerate = () =>
    generate.mutate(
      { period: "24h" },
      {
        onSuccess: () => {
          refresh();
          toast.success("Report generated");
        },
        onError: () => toast.error("Failed to generate report"),
      },
    );

  const onDelete = (id) =>
    deleteReport.mutate(id, {
      onSuccess: () => {
        refresh();
        toast.success("Report deleted");
      },
      onError: () => toast.error("Failed to delete report"),
    });

  const onClear = () =>
    clearAll.mutate(undefined, {
      onSuccess: () => {
        refresh();
        toast.success("Cleared all reports");
      },
      onError: () => toast.error("Failed to clear"),
    });

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy not available");
    }
  };

  const onDownload = (report, format) => {
    if (!report) return;
    const isMd = format === "md";
    const content = isMd
      ? reportToMarkdown(report)
      : JSON.stringify(report, null, 2);
    const blob = new Blob([content], {
      type: isMd ? "text/markdown" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (report.title ?? "report").replace(/[^a-z0-9-_]+/gi, "-");
    a.download = `${safeTitle}.${isMd ? "md" : "json"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and review snapshots of whale, flow, and stablecoin
            metrics.
          </p>
        </div>
        <DataSourceBadge
          status="cached"
          provider="local-storage"
          lastUpdated={reports[0]?.createdAt}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {reports.length} report{reports.length === 1 ? "" : "s"} stored
          locally
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onGenerate}
            disabled={generate.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            {generate.isPending ? "Generating…" : "Generate report"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onClear}
            disabled={reports.length === 0 || clearAll.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Click Generate report to capture a snapshot of current signals."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveId(r.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                    r.id === activeId
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-card/50 hover:bg-accent/30",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="muted">{r.period}</Badge>
                      <span>{formatRelativeTime(r.createdAt)}</span>
                    </div>
                  </div>
                  <Trash2
                    className="h-4 w-4 shrink-0 text-muted-foreground hover:text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(r.id);
                    }}
                  />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {active?.title ?? "Select a report"}
                </CardTitle>
                {active ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopy(reportToMarkdown(active))}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy MD
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownload(active, "md")}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {active ? (
                <Tabs defaultValue="preview">
                  <TabsList>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                    <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview">
                    <ReportPreview report={active} />
                  </TabsContent>

                  <TabsContent value="json">
                    <CodePane
                      content={JSON.stringify(active, null, 2)}
                      onCopy={onCopy}
                      onDownload={() => onDownload(active, "json")}
                    />
                  </TabsContent>

                  <TabsContent value="markdown">
                    <CodePane
                      content={reportToMarkdown(active)}
                      onCopy={onCopy}
                      onDownload={() => onDownload(active, "md")}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pick a report from the history.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ReportPreview({ report }) {
  const s = report.summary ?? {};
  const stats = [
    { label: "Whale volume", value: formatUsdCompact(s.totalWhaleVolume ?? 0) },
    { label: "Critical events", value: s.criticalCount ?? 0 },
    { label: "Exchange deposits", value: s.exchangeDeposits ?? 0 },
    { label: "Exchange withdrawals", value: s.exchangeWithdrawals ?? 0 },
    { label: "Total inflow", value: formatUsdCompact(s.totalInflow ?? 0) },
    { label: "Total outflow", value: formatUsdCompact(s.totalOutflow ?? 0) },
    { label: "Stable health", value: `${s.stableHealth ?? 0}/100` },
    { label: "BTC 24h", value: formatPercent(s.btcChange24h ?? 0) },
    { label: "ETH 24h", value: formatPercent(s.ethChange24h ?? 0) },
  ];
  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Generated {new Date(report.createdAt).toLocaleString()} · period{" "}
        {report.period}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border/60 bg-card/50 p-3"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums">
              {s.value}
            </div>
          </div>
        ))}
      </div>
      {report.highlights?.length ? (
        <div className="rounded-lg border border-border/60 bg-card/50 p-3 text-sm">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Highlights
          </div>
          <ul className="space-y-1">
            {report.highlights.map((h) => (
              <li
                key={h.name}
                className="flex items-center justify-between border-b border-border/40 py-1 last:border-0"
              >
                <span>{h.name}</span>
                <span className="font-medium tabular-nums">
                  {typeof h.value === "number" && h.name.includes("%")
                    ? formatPercent(h.value)
                    : typeof h.value === "number" && h.value >= 1000
                      ? formatUsd(h.value, 0)
                      : h.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CodePane({ content, onCopy, onDownload }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onCopy(content)}>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>
      <pre className="max-h-[480px] overflow-auto rounded-lg border border-border bg-card/80 p-4 text-xs leading-relaxed">
        <code>{content}</code>
      </pre>
    </div>
  );
}

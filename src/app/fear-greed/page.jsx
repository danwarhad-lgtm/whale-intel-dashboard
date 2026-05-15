"use client";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function classify(v) {
  if (v <= 24) return { label: "Extreme Fear", variant: "danger", color: "#f87171" };
  if (v <= 44) return { label: "Fear", variant: "warning", color: "#fbbf24" };
  if (v <= 55) return { label: "Neutral", variant: "muted", color: "#94a3b8" };
  if (v <= 74) return { label: "Greed", variant: "success", color: "#34d399" };
  return { label: "Extreme Greed", variant: "success", color: "#22c55e" };
}

export default function FearGreedPage() {
  const q = useQuery({ queryKey: ["fear-greed"], queryFn: () => fetchJson("/api/fear-greed"), refetchInterval: 5 * 60_000 });
  const cur = q.data?.data?.current;
  const history = q.data?.data?.history ?? [];
  const meta = cur ? classify(cur.value) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Fear &amp; Greed</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Crypto market sentiment index, 0–100 scale. Source: alternative.me.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      {q.isLoading ? <CardSkeleton rows={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <>
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current Index</div>
              <div className="relative">
                <div
                  className="text-7xl font-mono font-bold tabular-nums"
                  style={{ color: meta?.color, textShadow: `0 0 32px ${meta?.color}40` }}
                >
                  {cur?.value ?? "—"}
                </div>
              </div>
              {meta ? <Badge variant={meta.variant} className="text-sm">{meta.label}</Badge> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>60-day history</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer>
                  <LineChart data={history.map((d) => ({ ts: new Date(d.timestamp).toLocaleDateString(), value: d.value }))}>
                    <XAxis dataKey="ts" tick={{ fontSize: 10, fill: "#8b94a8" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8b94a8" }} />
                    <Tooltip contentStyle={{ background: "#0d1119", border: "1px solid #1c2436", borderRadius: 8 }} />
                    <ReferenceLine y={25} stroke="#f87171" strokeDasharray="3 3" />
                    <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" />
                    <ReferenceLine y={75} stroke="#34d399" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

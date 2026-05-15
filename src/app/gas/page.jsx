"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Fuel, Zap, Snail, Rocket, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

const CHAINS = [
  { value: "eth", label: "Ethereum" },
  { value: "bsc", label: "BNB Chain" },
  { value: "poly", label: "Polygon" },
  { value: "ftm", label: "Fantom" },
  { value: "arb", label: "Arbitrum" },
  { value: "avax", label: "Avalanche" },
  { value: "base", label: "Base" },
];

export default function GasPage() {
  const [chain, setChain] = React.useState("eth");
  const q = useQuery({ queryKey: ["gas", chain], queryFn: () => fetchJson(`/api/gas?chain=${chain}`), refetchInterval: 30_000 });
  const d = q.data?.data;

  const tile = (label, speed, icon) => (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          {icon}{label}
        </div>
        <div className="font-mono text-2xl font-semibold tabular-nums text-primary">
          {speed?.maxFeePerGas ? speed.maxFeePerGas.toFixed(2) : "—"}
          <span className="ml-1 text-xs font-normal text-muted-foreground">gwei</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          tip {speed?.maxPriorityFeePerGas?.toFixed(3) ?? "—"} · est ${speed?.estimatedFee?.toFixed(4) ?? "—"}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Gas Tracker</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Multi-chain gas prices via Owlracle. Refreshes every 30s.</p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Fuel className="h-4 w-4 text-primary" />Chain</CardTitle></CardHeader>
        <CardContent>
          <Select value={chain} onValueChange={setChain}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{CHAINS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {q.isLoading ? <CardSkeleton rows={4} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tile("Slow", d?.slow, <Snail className="h-3.5 w-3.5" />)}
            {tile("Standard", d?.standard, <Fuel className="h-3.5 w-3.5" />)}
            {tile("Fast", d?.fast, <Zap className="h-3.5 w-3.5" />)}
            {tile("Instant", d?.instant, <Rocket className="h-3.5 w-3.5" />)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={Clock} label="Avg block time" value={`${(d?.avgTime ?? 0).toFixed(2)}s`} />
            <StatCard label="Base fee" value={`${(d?.baseFee ?? 0).toFixed(2)} gwei`} />
            <StatCard label="Avg gas / tx" value={`${(d?.avgGas ?? 0).toFixed(0)}`} />
          </div>
        </>
      )}
    </div>
  );
}

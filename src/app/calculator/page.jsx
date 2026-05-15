"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, ArrowRightLeft, Target, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatUsd } from "@/lib/format";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export default function CalculatorPage() {
  const q = useQuery({ queryKey: ["calc-market"], queryFn: () => fetchJson("/api/market"), refetchInterval: 60_000 });
  const coins = q.data?.data?.coins ?? [];

  const [from, setFrom] = React.useState("bitcoin");
  const [to, setTo] = React.useState("ethereum");
  const [amount, setAmount] = React.useState("1");

  const fromCoin = coins.find((c) => c.id === from);
  const toCoin = coins.find((c) => c.id === to);
  const amt = parseFloat(amount) || 0;
  const usdValue = amt * (fromCoin?.current_price ?? 0);
  const toAmount = toCoin ? usdValue / (toCoin.current_price ?? 1) : 0;

  const [entry, setEntry] = React.useState("100");
  const [exit, setExit] = React.useState("150");
  const [size, setSize] = React.useState("1000");
  const entryF = parseFloat(entry) || 0;
  const exitF = parseFloat(exit) || 0;
  const sizeF = parseFloat(size) || 0;
  const pnlPct = entryF > 0 ? ((exitF - entryF) / entryF) * 100 : 0;
  const pnlUsd = sizeF * (pnlPct / 100);

  const [equity, setEquity] = React.useState("10000");
  const [riskPct, setRiskPct] = React.useState("1");
  const [stopPct, setStopPct] = React.useState("5");
  const equityF = parseFloat(equity) || 0;
  const riskF = parseFloat(riskPct) || 0;
  const stopF = parseFloat(stopPct) || 0;
  const riskUsd = (equityF * riskF) / 100;
  const positionSize = stopF > 0 ? (riskUsd / stopF) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Calculator</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Convert between crypto, calculate PnL, and size positions.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      <Tabs defaultValue="convert">
        <TabsList>
          <TabsTrigger value="convert"><ArrowRightLeft className="mr-2 h-3 w-3" />Convert</TabsTrigger>
          <TabsTrigger value="pnl"><Target className="mr-2 h-3 w-3" />PnL</TabsTrigger>
          <TabsTrigger value="size"><Coins className="mr-2 h-3 w-3" />Position size</TabsTrigger>
        </TabsList>

        <TabsContent value="convert">
          <Card>
            <CardHeader><CardTitle>Crypto converter</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>From</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{coins.slice(0, 20).map((c) => <SelectItem key={c.id} value={c.id}>{c.symbol.toUpperCase()} · {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{coins.slice(0, 20).map((c) => <SelectItem key={c.id} value={c.id}>{c.symbol.toUpperCase()} · {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 rounded-xl border border-border/60 bg-card/50 p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Result</div>
                <div className="mt-1 font-mono text-3xl font-semibold tabular-nums text-primary">
                  {amt.toFixed(4)} {fromCoin?.symbol.toUpperCase()} = {toAmount.toFixed(6)} {toCoin?.symbol.toUpperCase()}
                </div>
                <div className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">≈ {formatUsd(usdValue)} USD</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl">
          <Card>
            <CardHeader><CardTitle>Profit & Loss</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5"><Label>Entry price (USD)</Label><Input type="number" value={entry} onChange={(e) => setEntry(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Exit price (USD)</Label><Input type="number" value={exit} onChange={(e) => setExit(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Position size (USD)</Label><Input type="number" value={size} onChange={(e) => setSize(e.target.value)} /></div>
              <div className="md:col-span-3 rounded-xl border border-border/60 bg-card/50 p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">PnL %</div>
                    <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${pnlPct >= 0 ? "text-success" : "text-danger"}`}>{pnlPct.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">PnL USD</div>
                    <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${pnlUsd >= 0 ? "text-success" : "text-danger"}`}>{formatUsd(pnlUsd)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="size">
          <Card>
            <CardHeader><CardTitle>Position sizing (% risk model)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5"><Label>Account equity (USD)</Label><Input type="number" value={equity} onChange={(e) => setEquity(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Risk per trade (%)</Label><Input type="number" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Stop loss distance (%)</Label><Input type="number" value={stopPct} onChange={(e) => setStopPct(e.target.value)} /></div>
              <div className="md:col-span-3 rounded-xl border border-border/60 bg-card/50 p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Risk USD</div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{formatUsd(riskUsd)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Position size</div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-primary">{formatUsd(positionSize)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

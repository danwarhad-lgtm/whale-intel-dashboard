"use client";
import * as React from "react";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const TERMS = [
  { term: "TVL (Total Value Locked)", category: "DeFi", def: "Total amount of assets deposited in a DeFi protocol or chain. Used as a proxy for protocol size and trust." },
  { term: "APY (Annual Percentage Yield)", category: "DeFi", def: "Yearly return on investment including compounding. Higher APY usually means higher risk." },
  { term: "Impermanent Loss (IL)", category: "DeFi", def: "Loss LPs can experience when token prices in a pool diverge from the time of deposit. Reverses if prices return." },
  { term: "Stablecoin", category: "Stablecoin", def: "Crypto pegged to a stable asset, usually USD. Examples: USDT, USDC, DAI." },
  { term: "Peg Deviation", category: "Stablecoin", def: "How far a stablecoin's market price drifts from its reference (1.00 USD). Large deviations signal stress." },
  { term: "Whale", category: "On-chain", def: "Wallet holding large amounts of crypto, capable of moving markets. Tracked because their flows often precede price action." },
  { term: "Exchange Inflow", category: "On-chain", def: "Tokens moving INTO centralized exchanges. Often interpreted as bearish (preparing to sell)." },
  { term: "Exchange Outflow", category: "On-chain", def: "Tokens leaving CEXs to self-custody. Often interpreted as bullish (long-term holding)." },
  { term: "Netflow", category: "On-chain", def: "Outflow minus inflow on exchanges. Positive = withdrawals dominating, negative = deposits dominating." },
  { term: "Gas Fee", category: "Network", def: "Cost paid in native token to execute a transaction or smart contract on a blockchain." },
  { term: "Base Fee", category: "Network", def: "Minimum gas required per block (EIP-1559). Burned and not paid to miners/validators." },
  { term: "Priority Fee (Tip)", category: "Network", def: "Extra gas paid to validators to prioritize a transaction. Increases inclusion speed." },
  { term: "Market Cap", category: "Market", def: "Current price × circulating supply. Quick measure of project size, but doesn't capture liquidity or float." },
  { term: "Fully Diluted Valuation (FDV)", category: "Market", def: "Price × max supply. Forward-looking valuation — useful to spot heavy dilution risk." },
  { term: "Volume", category: "Market", def: "USD value of all trades over a time window. Liquidity proxy. Low volume = harder to enter/exit." },
  { term: "Dominance", category: "Market", def: "Share of a token's market cap vs total crypto market cap. Rising BTC dominance = altcoin weakness." },
  { term: "Fear & Greed Index", category: "Sentiment", def: "0–100 score blending volatility, volume, social, dominance and surveys. Contrarian signal in extremes." },
  { term: "Slippage", category: "Trading", def: "Difference between expected and executed price. Worse on illiquid pools and large orders." },
  { term: "Composite Risk Score", category: "Method", def: "Internal blend of volatility, whale activity, exchange pressure, stablecoin health, and volume change. 0–100 scale." },
  { term: "Liquidation", category: "Trading", def: "Forced position close when collateral falls below maintenance margin. Cascade liquidations amplify volatility." },
];

const CATEGORIES = ["All", ...Array.from(new Set(TERMS.map((t) => t.category)))];

export default function GlossaryPage() {
  const [search, setSearch] = React.useState("");
  const [cat, setCat] = React.useState("All");
  const filtered = TERMS.filter((t) => {
    if (cat !== "All" && t.category !== cat) return false;
    if (search && !`${t.term} ${t.def}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">Glossary</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Crypto and on-chain terminology used across this dashboard.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Browse {filtered.length} of {TERMS.length} terms</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search terms..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${cat === c ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {filtered.map((t) => (
          <Card key={t.term}>
            <CardContent className="space-y-2 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{t.term}</h3>
                <Badge variant="muted">{t.category}</Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{t.def}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Scoring helpers: composite market risk + sub-scores.
 */
import { clamp } from "./format";

export function riskLabel(score) {
  if (score < 20) return "Low";
  if (score < 40) return "Moderate";
  if (score < 60) return "Elevated";
  if (score < 80) return "High";
  return "Critical";
}

/**
 * @param {{btcChange24h:number, ethChange24h:number, volumeChangePct:number, whaleScore:number, exchangeScore:number, stablecoinScore:number}} inputs
 */
export function calculateMarketRiskScore(inputs) {
  const volatility = clamp(
    Math.abs(inputs.btcChange24h ?? 0) * 4 +
      Math.abs(inputs.ethChange24h ?? 0) * 4,
    0,
    100
  );
  const volume = clamp(Math.abs(inputs.volumeChangePct ?? 0) * 2, 0, 100);
  const whale = clamp(inputs.whaleScore ?? 0, 0, 100);
  const pressure = clamp(inputs.exchangeScore ?? 0, 0, 100);
  const stableRisk = clamp(100 - (inputs.stablecoinScore ?? 80), 0, 100);

  const w = {
    volatility: 0.25,
    whale: 0.2,
    pressure: 0.25,
    stable: 0.2,
    volume: 0.1,
  };

  const score = clamp(
    volatility * w.volatility +
      whale * w.whale +
      pressure * w.pressure +
      stableRisk * w.stable +
      volume * w.volume,
    0,
    100
  );

  const label = riskLabel(score);

  const factors = [
    {
      name: "BTC/ETH Volatility",
      weight: w.volatility,
      contribution: volatility * w.volatility,
    },
    {
      name: "Whale Activity",
      weight: w.whale,
      contribution: whale * w.whale,
    },
    {
      name: "Exchange Pressure",
      weight: w.pressure,
      contribution: pressure * w.pressure,
    },
    {
      name: "Stablecoin Risk",
      weight: w.stable,
      contribution: stableRisk * w.stable,
    },
    {
      name: "Volume Change",
      weight: w.volume,
      contribution: volume * w.volume,
    },
  ];

  return {
    score: Math.round(score),
    label,
    explanation: `Composite risk ${label.toLowerCase()} (${Math.round(
      score
    )}/100). Volatility ${volatility.toFixed(0)}, whale ${whale.toFixed(
      0
    )}, pressure ${pressure.toFixed(0)}, stable risk ${stableRisk.toFixed(
      0
    )}, volume ${volume.toFixed(0)}.`,
    factors,
  };
}

export function calculateWhaleActivityScore(transactions) {
  if (!transactions?.length) {
    return {
      score: 12,
      label: "Low",
      explanation: "No whale transactions in the recent window.",
    };
  }
  const totalUsd = transactions.reduce((acc, t) => acc + (t.valueUsd || 0), 0);
  const count = transactions.length;
  const criticalCount = transactions.filter(
    (t) => t.severity === "critical"
  ).length;
  const highCount = transactions.filter((t) => t.severity === "high").length;

  const usdScore = clamp((totalUsd / 1_000_000_000) * 60, 0, 60);
  const countScore = clamp((count / 80) * 25, 0, 25);
  const severityScore = clamp(criticalCount * 5 + highCount * 2, 0, 15);

  const score = clamp(usdScore + countScore + severityScore, 0, 100);
  return {
    score: Math.round(score),
    label: riskLabel(score),
    explanation: `${count} whale transactions worth $${(totalUsd / 1_000_000).toFixed(
      1
    )}M (${criticalCount} critical, ${highCount} high) in window.`,
  };
}

export function calculateExchangePressureScore(flows) {
  if (!flows?.length) {
    return {
      score: 50,
      label: "Moderate",
      explanation: "No exchange flow data available.",
      netflowUsd: 0,
    };
  }
  let inflow = 0;
  let outflow = 0;
  for (const f of flows) {
    inflow += f.inflowUsd || 0;
    outflow += f.outflowUsd || 0;
  }
  const total = inflow + outflow || 1;
  const inflowShare = inflow / total;
  const score = clamp(20 + inflowShare * 80, 0, 100);
  const netflowUsd = outflow - inflow;
  return {
    score: Math.round(score),
    label: riskLabel(score),
    explanation: `Inflows $${(inflow / 1e9).toFixed(2)}B vs outflows $${(
      outflow / 1e9
    ).toFixed(2)}B (net ${(netflowUsd / 1e9).toFixed(2)}B).`,
    netflowUsd,
  };
}

export function calculateStablecoinHealthScore(stablecoins) {
  if (!stablecoins?.length) {
    return {
      score: 80,
      label: "Stable",
      explanation: "No stablecoin data available, assuming nominal peg.",
      worstDeviation: null,
    };
  }
  let penalty = 0;
  let worst = null;
  for (const s of stablecoins) {
    const dev = Math.abs(s.pegDeviationPct ?? 0);
    penalty += dev * 1000;
    if (!worst || dev > Math.abs(worst.pct)) {
      worst = { symbol: s.symbol, pct: s.pegDeviationPct };
    }
  }
  const score = clamp(100 - penalty, 0, 100);
  const label =
    score >= 90
      ? "Healthy"
      : score >= 70
      ? "Stable"
      : score >= 50
      ? "Watch"
      : "At Risk";
  return {
    score: Math.round(score),
    label,
    explanation: `Worst peg deviation ${
      worst ? (worst.pct * 100).toFixed(2) + "% (" + worst.symbol + ")" : "0%"
    } across ${stablecoins.length} stables.`,
    worstDeviation: worst,
  };
}

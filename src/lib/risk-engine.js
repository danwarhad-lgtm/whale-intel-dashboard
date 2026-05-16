/**
 * Risk Engine — Composite scoring for crypto market state.
 *
 * Implements the canonical formula:
 *
 *   R = 100 × (w₁·V + w₂·F + w₃·D + w₄·S + w₅·W)
 *
 * where each sub-factor is normalized to [0, 1] (1 = healthy, 0 = stressed):
 *
 *   V = 1 − σ̂_24h                Volatility (lower σ → healthier)
 *   F = fearGreedIndex / 100      Alternative.me Fear & Greed
 *   D = clampedDominanceHealth(btcDominance)
 *   S = stablecoin peg & supply health
 *   W = 1 − whaleStressDensity    Whale activity density (more deposits to
 *                                  CEX hot wallets → more sell pressure → lower)
 *
 * Default weights sum to 1.0 (see WEIGHTS below). The Python implementation
 * in `api/score.py` is the authoritative version — this JS module is a mirror
 * so the UI stays responsive when the Python serverless function cold-starts.
 *
 * Both files MUST be kept in sync. See AGENTS.md → "Adding a new risk sub-factor".
 */

export const WEIGHTS = Object.freeze({
  volatility: 0.25,
  fearGreed: 0.2,
  dominance: 0.15,
  stable: 0.2,
  whale: 0.2,
});

// Compile-time invariant check: weights must sum to ~1.0.
const WEIGHT_SUM = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(WEIGHT_SUM - 1.0) > 1e-9) {
  // Throw at module load, not at runtime — caught by `pnpm build` and tests.
  throw new Error(
    `risk-engine WEIGHTS must sum to 1.0, got ${WEIGHT_SUM.toFixed(6)}`,
  );
}

const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/**
 * Normalize a 24h volatility figure (e.g. price change percentage) into a
 * health score in [0, 1].  Tuned so that:
 *   - 0% change   → 1.0  (calm market)
 *   - 5% change   → 0.5
 *   - 10% change  → 0.0  (saturated, very volatile)
 */
export function volatilityScore(absChangePct24h) {
  if (!Number.isFinite(absChangePct24h)) return 0.5;
  const x = Math.abs(absChangePct24h);
  return clamp(1 - x / 10);
}

/**
 * Fear & Greed (0..100) → [0, 1] with mid-band slightly preferred.
 * 0 (extreme fear) and 100 (extreme greed) both penalized.
 */
export function fearGreedScore(fng) {
  if (!Number.isFinite(fng)) return 0.5;
  const norm = clamp(fng / 100);
  // Triangle peak at 0.5 (neutral): healthier than the extremes.
  return 1 - Math.abs(norm - 0.5) * 2 * 0.4;
}

/**
 * BTC dominance health.
 *  - Healthy band ~ 40%–55% → score 1.0
 *  - Outside band drops linearly to 0 by 25% / 75%
 */
export function dominanceScore(btcDominancePct) {
  if (!Number.isFinite(btcDominancePct)) return 0.5;
  const x = btcDominancePct;
  if (x >= 40 && x <= 55) return 1;
  if (x < 40) return clamp((x - 25) / 15);
  return clamp((75 - x) / 20);
}

/**
 * Stablecoin health from peg deviation + supply trend.
 *
 * @param {object} params
 * @param {number} params.maxPegDeviationPct  Largest |1 − price| among tracked stables, in %.
 * @param {number} params.supplyChange7dPct   Aggregate stable-supply 7d change %.
 */
export function stableHealthScore({
  maxPegDeviationPct = 0,
  supplyChange7dPct = 0,
} = {}) {
  // Peg deviation: 0% → 1.0, 1% → 0.5, ≥2% → 0.
  const pegHealth = clamp(1 - Math.abs(maxPegDeviationPct) / 2);
  // Supply trend: growth is bullish liquidity; -5% → 0, +5% → 1, clamped.
  const supplyHealth = clamp(0.5 + supplyChange7dPct / 10);
  return clamp(0.6 * pegHealth + 0.4 * supplyHealth);
}

/**
 * Whale activity density derived from /api/whale-transactions.
 * Higher exchange-deposit ratio → bearish → score lower.
 *
 * @param {object} params
 * @param {number} params.totalCount        Total whale txs in the window.
 * @param {number} params.depositCount      Count classified as exchange_deposit.
 * @param {number} params.totalVolumeUsd    Aggregated USD volume.
 */
export function whaleStressScore({
  totalCount = 0,
  depositCount = 0,
  totalVolumeUsd = 0,
} = {}) {
  if (totalCount === 0) return 0.7; // No data → neutral-ish.
  const depositRatio = depositCount / totalCount;
  // depositRatio 0 → bullish (1.0), 0.5 → neutral (0.5), 1.0 → bearish (0.0).
  const ratioHealth = clamp(1 - depositRatio);
  // Volume saturation: very high volume → mildly negative regardless.
  const volPenalty = clamp(totalVolumeUsd / 1e9, 0, 0.3);
  return clamp(ratioHealth - volPenalty);
}

/**
 * Compute the full composite score plus per-factor breakdown.
 *
 * @param {object} input
 * @param {number} input.absChangePct24h
 * @param {number} input.fearGreed
 * @param {number} input.btcDominancePct
 * @param {object} input.stable
 * @param {object} input.whale
 * @returns {{
 *   score: number,                    // 0..100
 *   factors: {
 *     volatility: { value: number, score: number, explanation: string },
 *     fearGreed:  { value: number, score: number, explanation: string },
 *     dominance:  { value: number, score: number, explanation: string },
 *     stable:     { value: number, score: number, explanation: string },
 *     whale:      { value: number, score: number, explanation: string },
 *   }
 * }}
 */
export function compositeScore(input = {}) {
  const v = volatilityScore(input.absChangePct24h);
  const f = fearGreedScore(input.fearGreed);
  const d = dominanceScore(input.btcDominancePct);
  const s = stableHealthScore(input.stable);
  const w = whaleStressScore(input.whale);

  const blended =
    WEIGHTS.volatility * v +
    WEIGHTS.fearGreed * f +
    WEIGHTS.dominance * d +
    WEIGHTS.stable * s +
    WEIGHTS.whale * w;

  const score = Math.round(blended * 100);

  return {
    score,
    factors: {
      volatility: {
        value: input.absChangePct24h ?? null,
        score: v,
        explanation: explainVolatility(v, input.absChangePct24h),
      },
      fearGreed: {
        value: input.fearGreed ?? null,
        score: f,
        explanation: explainFearGreed(input.fearGreed),
      },
      dominance: {
        value: input.btcDominancePct ?? null,
        score: d,
        explanation: explainDominance(input.btcDominancePct),
      },
      stable: {
        value: input.stable ?? null,
        score: s,
        explanation: explainStable(s),
      },
      whale: {
        value: input.whale ?? null,
        score: w,
        explanation: explainWhale(w, input.whale),
      },
    },
  };
}

/* ----------------------- explanation builders --------------------------- */

function explainVolatility(score, val) {
  if (score >= 0.8) return `Calm 24h price action${val != null ? ` (${val.toFixed(2)}%)` : ""}.`;
  if (score >= 0.5) return `Moderate volatility${val != null ? ` (${val.toFixed(2)}%)` : ""}.`;
  return `High 24h volatility${val != null ? ` (${val.toFixed(2)}%)` : ""} — caution.`;
}

function explainFearGreed(fng) {
  if (!Number.isFinite(fng)) return "Fear & Greed unavailable.";
  if (fng <= 25) return `Extreme fear (${fng}) — historically a contrarian buy zone.`;
  if (fng <= 45) return `Fear (${fng}) — risk-off sentiment.`;
  if (fng <= 55) return `Neutral (${fng}).`;
  if (fng <= 75) return `Greed (${fng}) — risk-on sentiment.`;
  return `Extreme greed (${fng}) — historically a topping signal.`;
}

function explainDominance(d) {
  if (!Number.isFinite(d)) return "Dominance unavailable.";
  if (d < 35) return `Low BTC dominance (${d.toFixed(1)}%) — alt-heavy market.`;
  if (d > 60) return `High BTC dominance (${d.toFixed(1)}%) — flight to BTC.`;
  return `Balanced dominance (${d.toFixed(1)}%).`;
}

function explainStable(score) {
  if (score >= 0.8) return "Stablecoins healthy: tight peg, supply growing.";
  if (score >= 0.5) return "Stablecoins mixed: minor peg drift or flat supply.";
  return "Stablecoin stress: peg deviation or shrinking supply.";
}

function explainWhale(score, params) {
  if (!params || params.totalCount === 0) return "No whale activity in window.";
  const ratio = params.depositCount / Math.max(params.totalCount, 1);
  if (ratio > 0.6) return `Heavy CEX deposits (${(ratio * 100).toFixed(0)}%) — sell pressure.`;
  if (ratio < 0.3) return `Withdrawals dominate (${((1 - ratio) * 100).toFixed(0)}% out) — accumulation.`;
  return `Balanced whale flows (${(ratio * 100).toFixed(0)}% deposits).`;
}

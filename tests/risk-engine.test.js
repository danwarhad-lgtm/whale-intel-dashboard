import { describe, it, expect } from "vitest";
import {
  WEIGHTS,
  volatilityScore,
  fearGreedScore,
  dominanceScore,
  stableHealthScore,
  whaleStressScore,
  compositeScore,
} from "../src/lib/risk-engine.js";

describe("risk-engine WEIGHTS", () => {
  it("must sum to exactly 1.0", () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(total - 1.0)).toBeLessThan(1e-9);
  });
});

describe("volatilityScore", () => {
  it("returns 1.0 for zero change", () => {
    expect(volatilityScore(0)).toBeCloseTo(1.0, 5);
  });
  it("returns 0.5 at 5%", () => {
    expect(volatilityScore(5)).toBeCloseTo(0.5, 5);
  });
  it("clamps negative changes to absolute value", () => {
    expect(volatilityScore(-5)).toBeCloseTo(0.5, 5);
  });
  it("saturates to 0 beyond 10%", () => {
    expect(volatilityScore(15)).toBe(0);
  });
  it("returns mid value for non-finite input", () => {
    expect(volatilityScore(NaN)).toBe(0.5);
    expect(volatilityScore(undefined)).toBe(0.5);
  });
});

describe("fearGreedScore", () => {
  it("peaks at 50 (neutral)", () => {
    expect(fearGreedScore(50)).toBeCloseTo(1.0, 5);
  });
  it("penalizes extreme fear", () => {
    expect(fearGreedScore(0)).toBeLessThan(fearGreedScore(50));
  });
  it("penalizes extreme greed", () => {
    expect(fearGreedScore(100)).toBeLessThan(fearGreedScore(50));
  });
  it("treats fear and greed symmetrically", () => {
    expect(fearGreedScore(20)).toBeCloseTo(fearGreedScore(80), 5);
  });
});

describe("dominanceScore", () => {
  it("returns 1.0 inside [40, 55]", () => {
    expect(dominanceScore(45)).toBe(1);
    expect(dominanceScore(50)).toBe(1);
  });
  it("decays below 40", () => {
    expect(dominanceScore(30)).toBeLessThan(1);
    expect(dominanceScore(25)).toBe(0);
  });
  it("decays above 55", () => {
    expect(dominanceScore(70)).toBeLessThan(1);
    expect(dominanceScore(75)).toBe(0);
  });
});

describe("stableHealthScore", () => {
  it("returns 1.0 with perfect peg and growing supply", () => {
    expect(
      stableHealthScore({ maxPegDeviationPct: 0, supplyChange7dPct: 5 }),
    ).toBeCloseTo(1.0, 5);
  });
  it("penalizes peg deviation", () => {
    const a = stableHealthScore({ maxPegDeviationPct: 0 });
    const b = stableHealthScore({ maxPegDeviationPct: 1.5 });
    expect(b).toBeLessThan(a);
  });
  it("penalizes shrinking supply", () => {
    const a = stableHealthScore({ supplyChange7dPct: 0 });
    const b = stableHealthScore({ supplyChange7dPct: -5 });
    expect(b).toBeLessThan(a);
  });
});

describe("whaleStressScore", () => {
  it("neutral when no data", () => {
    expect(whaleStressScore({ totalCount: 0 })).toBe(0.7);
  });
  it("scores 1.0 when all withdrawals", () => {
    expect(
      whaleStressScore({ totalCount: 10, depositCount: 0, totalVolumeUsd: 0 }),
    ).toBe(1);
  });
  it("scores 0 when all deposits and high volume", () => {
    expect(
      whaleStressScore({
        totalCount: 10,
        depositCount: 10,
        totalVolumeUsd: 1e10,
      }),
    ).toBe(0);
  });
});

describe("compositeScore", () => {
  it("returns score in [0, 100] for any input", () => {
    const r = compositeScore({
      absChangePct24h: 5,
      fearGreed: 50,
      btcDominancePct: 50,
      stable: { maxPegDeviationPct: 0.1, supplyChange7dPct: 0 },
      whale: { totalCount: 5, depositCount: 2, totalVolumeUsd: 1e7 },
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("includes per-factor breakdown with explanations", () => {
    const r = compositeScore({});
    expect(r.factors.volatility.explanation).toBeTypeOf("string");
    expect(r.factors.fearGreed.explanation).toBeTypeOf("string");
    expect(r.factors.dominance.explanation).toBeTypeOf("string");
    expect(r.factors.stable.explanation).toBeTypeOf("string");
    expect(r.factors.whale.explanation).toBeTypeOf("string");
  });

  it("penalizes a stressed market", () => {
    const calm = compositeScore({
      absChangePct24h: 0.5,
      fearGreed: 50,
      btcDominancePct: 50,
      stable: { maxPegDeviationPct: 0.05 },
      whale: { totalCount: 10, depositCount: 5, totalVolumeUsd: 1e7 },
    });
    const stressed = compositeScore({
      absChangePct24h: 12,
      fearGreed: 8,
      btcDominancePct: 75,
      stable: { maxPegDeviationPct: 2.5, supplyChange7dPct: -8 },
      whale: { totalCount: 20, depositCount: 19, totalVolumeUsd: 5e9 },
    });
    expect(stressed.score).toBeLessThan(calm.score);
  });
});

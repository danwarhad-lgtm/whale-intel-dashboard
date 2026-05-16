"""
Whale Intel — Composite Risk Score (authoritative implementation).

Vercel serverless function. The JS mirror lives in `src/lib/risk-engine.js`
and MUST be kept in sync. See AGENTS.md → "Adding a new risk sub-factor".

Formula:
    R = 100 * (w1*V + w2*F + w3*D + w4*S + w5*W)

where:
    V = volatility health    in [0, 1]
    F = fear & greed health  in [0, 1]
    D = btc dominance health in [0, 1]
    S = stablecoin health    in [0, 1]
    W = whale stress health  in [0, 1]

Default weights (sum = 1.0):
    w1=0.25  w2=0.20  w3=0.15  w4=0.20  w5=0.20

Implementation notes:
    - No third-party deps (Vercel size limit). stdlib only.
    - All sub-scores normalized to [0, 1].
    - 60s response cache via the `Cache-Control` header.
"""

from __future__ import annotations

import json
import math
import sys
from http.server import BaseHTTPRequestHandler
from typing import Any
from urllib.error import URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

WEIGHTS = {
    "volatility": 0.25,
    "fearGreed": 0.20,
    "dominance": 0.15,
    "stable": 0.20,
    "whale": 0.20,
}

assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9, (
    f"WEIGHTS must sum to 1.0, got {sum(WEIGHTS.values())}"
)


# --------------------------------------------------------------------------- #
# Sub-factor calculators                                                      #
# --------------------------------------------------------------------------- #

def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def volatility_score(abs_change_pct_24h: float | None) -> float:
    """0% → 1.0, 5% → 0.5, ≥10% → 0.0."""
    if abs_change_pct_24h is None or not math.isfinite(abs_change_pct_24h):
        return 0.5
    return clamp(1 - abs(abs_change_pct_24h) / 10)


def fear_greed_score(fng: float | None) -> float:
    """Triangular peak at 50; both extremes penalized."""
    if fng is None or not math.isfinite(fng):
        return 0.5
    norm = clamp(fng / 100)
    return 1 - abs(norm - 0.5) * 2 * 0.4


def dominance_score(btc_dominance_pct: float | None) -> float:
    """40–55% band → 1.0, decays to 0 outside [25, 75]."""
    if btc_dominance_pct is None or not math.isfinite(btc_dominance_pct):
        return 0.5
    x = btc_dominance_pct
    if 40 <= x <= 55:
        return 1.0
    if x < 40:
        return clamp((x - 25) / 15)
    return clamp((75 - x) / 20)


def stable_health_score(
    max_peg_deviation_pct: float = 0,
    supply_change_7d_pct: float = 0,
) -> float:
    peg_health = clamp(1 - abs(max_peg_deviation_pct) / 2)
    supply_health = clamp(0.5 + supply_change_7d_pct / 10)
    return clamp(0.6 * peg_health + 0.4 * supply_health)


def whale_stress_score(
    total_count: int = 0,
    deposit_count: int = 0,
    total_volume_usd: float = 0,
) -> float:
    if total_count == 0:
        return 0.7
    deposit_ratio = deposit_count / total_count
    ratio_health = clamp(1 - deposit_ratio)
    vol_penalty = clamp(total_volume_usd / 1e9, 0, 0.3)
    return clamp(ratio_health - vol_penalty)


# --------------------------------------------------------------------------- #
# Composite                                                                   #
# --------------------------------------------------------------------------- #

def composite_score(payload: dict[str, Any]) -> dict[str, Any]:
    v = volatility_score(payload.get("absChangePct24h"))
    f = fear_greed_score(payload.get("fearGreed"))
    d = dominance_score(payload.get("btcDominancePct"))

    stable = payload.get("stable") or {}
    s = stable_health_score(
        max_peg_deviation_pct=stable.get("maxPegDeviationPct", 0),
        supply_change_7d_pct=stable.get("supplyChange7dPct", 0),
    )

    whale = payload.get("whale") or {}
    w = whale_stress_score(
        total_count=whale.get("totalCount", 0),
        deposit_count=whale.get("depositCount", 0),
        total_volume_usd=whale.get("totalVolumeUsd", 0),
    )

    blended = (
        WEIGHTS["volatility"] * v
        + WEIGHTS["fearGreed"] * f
        + WEIGHTS["dominance"] * d
        + WEIGHTS["stable"] * s
        + WEIGHTS["whale"] * w
    )

    return {
        "score": round(blended * 100),
        "factors": {
            "volatility": {"score": v, "value": payload.get("absChangePct24h")},
            "fearGreed":  {"score": f, "value": payload.get("fearGreed")},
            "dominance":  {"score": d, "value": payload.get("btcDominancePct")},
            "stable":     {"score": s, "value": stable},
            "whale":      {"score": w, "value": whale},
        },
        "weights": WEIGHTS,
    }


# --------------------------------------------------------------------------- #
# Optional: enrich payload by fetching live inputs ourselves                  #
# --------------------------------------------------------------------------- #

def _http_get(url: str, timeout: float = 4.0) -> Any | None:
    try:
        req = Request(url, headers={"User-Agent": "whale-intel-score/1.0"})
        with urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except (URLError, ValueError, TimeoutError):
        return None


def fetch_live_inputs() -> dict[str, Any]:
    """Pull free upstreams in best-effort fashion. Failures fall back to None."""
    out: dict[str, Any] = {}

    fng = _http_get("https://api.alternative.me/fng/?limit=1")
    try:
        out["fearGreed"] = int(fng["data"][0]["value"])
    except Exception:
        out["fearGreed"] = None

    cg = _http_get("https://api.coingecko.com/api/v3/global")
    try:
        out["btcDominancePct"] = float(cg["data"]["market_cap_percentage"]["btc"])
        out["absChangePct24h"] = float(
            cg["data"].get("market_cap_change_percentage_24h_usd", 0)
        )
    except Exception:
        out.setdefault("btcDominancePct", None)
        out.setdefault("absChangePct24h", None)

    return out


# --------------------------------------------------------------------------- #
# Vercel handler                                                              #
# --------------------------------------------------------------------------- #

class handler(BaseHTTPRequestHandler):  # noqa: N801 — Vercel convention
    def do_GET(self) -> None:  # noqa: N802 — Vercel convention
        try:
            qs = parse_qs(urlparse(self.path).query)
            live = "live" in qs and qs["live"][0] in ("1", "true", "yes")
            payload: dict[str, Any] = {}
            if live:
                payload.update(fetch_live_inputs())
            for key in ("absChangePct24h", "fearGreed", "btcDominancePct"):
                if key in qs:
                    try:
                        payload[key] = float(qs[key][0])
                    except (TypeError, ValueError):
                        pass
            result = composite_score(payload)
            body = json.dumps({
                "data": result,
                "status": "live" if live else "computed",
                "provider": "python-score-engine/1.0",
                "lastUpdated": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "public, max-age=60")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:  # noqa: BLE001
            self._error(500, repr(e))

    def do_POST(self) -> None:  # noqa: N802
        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
            body_raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body_raw or "{}")
            result = composite_score(payload)
            body = json.dumps({
                "data": result,
                "status": "computed",
                "provider": "python-score-engine/1.0",
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:  # noqa: BLE001
            self._error(400, repr(e))

    def _error(self, code: int, message: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))


# --------------------------------------------------------------------------- #
# CLI: `python3 api/score.py --test`                                          #
# --------------------------------------------------------------------------- #

def _self_test() -> int:
    cases = [
        # Calm, neutral market
        {"absChangePct24h": 0.5, "fearGreed": 50, "btcDominancePct": 50,
         "stable": {"maxPegDeviationPct": 0.05}, "whale": {"totalCount": 10, "depositCount": 5, "totalVolumeUsd": 1e7}},
        # Stressed market
        {"absChangePct24h": 9, "fearGreed": 15, "btcDominancePct": 70,
         "stable": {"maxPegDeviationPct": 1.5}, "whale": {"totalCount": 20, "depositCount": 18, "totalVolumeUsd": 2e9}},
    ]
    for i, c in enumerate(cases):
        r = composite_score(c)
        print(f"case {i}: score={r['score']} factors={ {k: round(v['score'], 2) for k, v in r['factors'].items()} }")
    return 0


if __name__ == "__main__":
    if "--test" in sys.argv:
        sys.exit(_self_test())
    print("Run with --test, or import composite_score().", file=sys.stderr)
    sys.exit(0)

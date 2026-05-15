"""
Vercel Python serverless function: composite market-risk scoring engine.
Endpoint: POST /api/score
Stdlib only — no numpy/pandas.

Body shape:
{
  "market":   { "btcChange24h": float, "ethChange24h": float, "volumeChangePct": float },
  "whale":    { "score": float },          # 0-100, from /api/whale-transactions summary
  "exchange": { "score": float },          # 0-100, from /api/exchange-flows summary
  "stable":   { "score": float }           # 0-100, from /api/stablecoins healthScore
}

Returns:
{
  "score":       float (0-100),
  "label":       "Low|Moderate|Elevated|High|Critical",
  "explanation": str,
  "factors":     [ { "name": str, "weight": float, "contribution": float } ]
}
"""
from http.server import BaseHTTPRequestHandler
import json
from datetime import datetime, timezone


WEIGHTS = {
    "btc_volatility":        0.20,
    "eth_volatility":        0.15,
    "volume_spike":          0.15,
    "whale_activity":        0.20,
    "exchange_pressure":     0.20,
    "stablecoin_instability": 0.10,
}

LABELS = [
    (20, "Low"),
    (40, "Moderate"),
    (60, "Elevated"),
    (80, "High"),
    (101, "Critical"),
]


def clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    if v != v:  # NaN
        return 0.0
    return max(lo, min(hi, v))


def label_for(score: float) -> str:
    for ceiling, name in LABELS:
        if score < ceiling:
            return name
    return "Critical"


def compute(payload: dict) -> dict:
    market   = payload.get("market", {})   or {}
    whale    = payload.get("whale", {})    or {}
    exchange = payload.get("exchange", {}) or {}
    stable   = payload.get("stable", {})   or {}

    btc_change = abs(float(market.get("btcChange24h", 0) or 0))
    eth_change = abs(float(market.get("ethChange24h", 0) or 0))
    vol_change = abs(float(market.get("volumeChangePct", 0) or 0))

    # Volatility 0% -> 0 score, >=10% -> 100
    btc_score = clamp(btc_change * 10)
    eth_score = clamp(eth_change * 10)
    vol_score = clamp(vol_change * 5)

    whale_score    = clamp(float(whale.get("score", 0)    or 0))
    exchange_score = clamp(float(exchange.get("score", 0) or 0))
    # Stablecoin health is INVERTED — higher health = lower risk.
    stable_health  = clamp(float(stable.get("score", 100) or 100))
    stable_risk    = 100.0 - stable_health

    factors = [
        {"name": "BTC volatility",         "weight": WEIGHTS["btc_volatility"],         "contribution": btc_score    * WEIGHTS["btc_volatility"]},
        {"name": "ETH volatility",         "weight": WEIGHTS["eth_volatility"],         "contribution": eth_score    * WEIGHTS["eth_volatility"]},
        {"name": "Volume spike",           "weight": WEIGHTS["volume_spike"],           "contribution": vol_score    * WEIGHTS["volume_spike"]},
        {"name": "Whale activity",         "weight": WEIGHTS["whale_activity"],         "contribution": whale_score    * WEIGHTS["whale_activity"]},
        {"name": "Exchange pressure",      "weight": WEIGHTS["exchange_pressure"],      "contribution": exchange_score * WEIGHTS["exchange_pressure"]},
        {"name": "Stablecoin instability", "weight": WEIGHTS["stablecoin_instability"], "contribution": stable_risk    * WEIGHTS["stablecoin_instability"]},
    ]

    score = sum(f["contribution"] for f in factors)
    score = round(clamp(score), 1)
    label = label_for(score)

    top = sorted(factors, key=lambda x: x["contribution"], reverse=True)[:3]
    explanation = "Top drivers: " + ", ".join(
        f"{f['name']} ({f['contribution']:.1f})" for f in top
    )

    return {
        "score":       score,
        "label":       label,
        "explanation": explanation,
        "factors":     factors,
        "computedAt":  datetime.now(timezone.utc).isoformat(),
        "engine":      "python-3.12-stdlib",
    }


class handler(BaseHTTPRequestHandler):  # noqa: N801 — Vercel convention
    def _send(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send(204, {})

    def do_GET(self) -> None:  # noqa: N802
        self._send(200, {
            "service":  "whale-intel score engine",
            "language": "python",
            "method":   "POST a JSON body to compute a composite risk score.",
            "weights":  WEIGHTS,
        })

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except json.JSONDecodeError as exc:
            self._send(400, {"error": f"invalid JSON: {exc}"})
            return

        try:
            result = compute(body)
        except Exception as exc:  # noqa: BLE001
            self._send(500, {"error": f"score failed: {exc}"})
            return

        self._send(200, result)

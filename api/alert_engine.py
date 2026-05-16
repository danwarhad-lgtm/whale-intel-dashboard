"""
Whale Intel — Alert Engine.

A rule-based alert engine that consumes whale transaction events and emits
structured alerts when configurable thresholds are breached. Designed to run
as a serverless POST endpoint or a CLI batch processor.

Rules can be tuned by the front-end via a JSON config payload, or persisted
in the optional Postgres schema (see sql/schema-postgres.sql). No third-party
deps — Vercel size limits force stdlib-only.

Usage:
    POST /api/alert_engine
    Body: { "transactions": [...], "rules": {...optional override...} }

CLI:
    python3 api/alert_engine.py --dry-run
    python3 api/alert_engine.py --input txs.json --rules rules.json
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler
from typing import Any


# --------------------------------------------------------------------------- #
# Default rules                                                               #
# --------------------------------------------------------------------------- #

DEFAULT_RULES = {
    "critical_usd": 50_000_000,        # any tx ≥ this triggers `critical`
    "high_usd": 10_000_000,
    "medium_usd": 2_000_000,
    "exchange_deposit_usd": 1_000_000, # CEX deposit tx ≥ this triggers a sell-pressure alert
    "stablecoin_burn_usd": 5_000_000,  # large stablecoin burn → de-peg risk
    "rapid_movement_window_sec": 300,  # how often we re-evaluate cluster events
    "rapid_movement_threshold": 5,     # ≥ N whale txs from one address in window
    "watched_chains": ["eth", "bsc", "polygon", "arbitrum", "btc"],
    "muted_tokens": [],                # tokens we never alert on
}


# --------------------------------------------------------------------------- #
# Alert data class                                                            #
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Alert:
    id: str
    severity: str
    rule: str
    title: str
    message: str
    chain: str
    token: str
    value_usd: float
    tx_hash: str
    explorer_url: str
    timestamp: str
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "severity": self.severity,
            "rule": self.rule,
            "title": self.title,
            "message": self.message,
            "chain": self.chain,
            "token": self.token,
            "valueUsd": self.value_usd,
            "txHash": self.tx_hash,
            "explorerUrl": self.explorer_url,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


# --------------------------------------------------------------------------- #
# Rule evaluators                                                             #
# --------------------------------------------------------------------------- #

def _severity_for(value_usd: float, rules: dict[str, Any]) -> str | None:
    if value_usd >= rules["critical_usd"]:
        return "critical"
    if value_usd >= rules["high_usd"]:
        return "high"
    if value_usd >= rules["medium_usd"]:
        return "medium"
    return None


def _exchange_deposit_alert(tx: dict[str, Any], rules: dict[str, Any]) -> Alert | None:
    if tx.get("type") != "exchange_deposit":
        return None
    val = float(tx.get("valueUsd", 0))
    if val < rules["exchange_deposit_usd"]:
        return None
    ex = tx.get("exchange") or "Unknown CEX"
    return Alert(
        id=f"deposit_{tx['hash']}",
        severity="high" if val >= rules["high_usd"] else "medium",
        rule="exchange_deposit_pressure",
        title=f"Whale deposited {tx.get('tokenSymbol', '?')} to {ex}",
        message=(
            f"${val:,.0f} of {tx.get('tokenSymbol')} moved to {ex} hot wallet "
            f"on {tx.get('chain', '').upper()}. Possible sell pressure."
        ),
        chain=tx.get("chain", ""),
        token=tx.get("tokenSymbol", ""),
        value_usd=val,
        tx_hash=tx.get("hash", ""),
        explorer_url=tx.get("blockExplorerUrl", ""),
        timestamp=tx.get("timestamp", ""),
        metadata={"exchange": ex, "from": tx.get("fromAddress")},
    )


def _large_transfer_alert(tx: dict[str, Any], rules: dict[str, Any]) -> Alert | None:
    val = float(tx.get("valueUsd", 0))
    sev = _severity_for(val, rules)
    if not sev:
        return None
    return Alert(
        id=f"transfer_{tx['hash']}",
        severity=sev,
        rule="large_transfer",
        title=f"Large {tx.get('tokenSymbol', '?')} transfer (${val:,.0f})",
        message=(
            f"{tx.get('chain', '?').upper()} transfer of "
            f"${val:,.0f} {tx.get('tokenSymbol')} from "
            f"{tx.get('fromLabel', 'Unknown')} → {tx.get('toLabel', 'Unknown')}."
        ),
        chain=tx.get("chain", ""),
        token=tx.get("tokenSymbol", ""),
        value_usd=val,
        tx_hash=tx.get("hash", ""),
        explorer_url=tx.get("blockExplorerUrl", ""),
        timestamp=tx.get("timestamp", ""),
    )


def _rapid_movement_alerts(
    txs: list[dict[str, Any]], rules: dict[str, Any]
) -> list[Alert]:
    """Detect addresses moving funds in rapid succession across the window."""
    by_addr: dict[str, list[dict[str, Any]]] = {}
    for t in txs:
        addr = (t.get("fromAddress") or "").lower()
        if not addr:
            continue
        by_addr.setdefault(addr, []).append(t)
    alerts: list[Alert] = []
    for addr, group in by_addr.items():
        if len(group) < rules["rapid_movement_threshold"]:
            continue
        total = sum(float(g.get("valueUsd", 0)) for g in group)
        sample = group[0]
        alerts.append(
            Alert(
                id=f"rapid_{addr[:12]}",
                severity="high",
                rule="rapid_movement",
                title=f"Address {addr[:10]}… moved {len(group)} times rapidly",
                message=(
                    f"{len(group)} whale transactions totaling "
                    f"${total:,.0f} from a single source address in the window. "
                    f"Possible distribution event."
                ),
                chain=sample.get("chain", ""),
                token=sample.get("tokenSymbol", ""),
                value_usd=total,
                tx_hash=sample.get("hash", ""),
                explorer_url=sample.get("blockExplorerUrl", ""),
                timestamp=sample.get("timestamp", ""),
                metadata={"address": addr, "txCount": len(group)},
            )
        )
    return alerts


# --------------------------------------------------------------------------- #
# Engine                                                                      #
# --------------------------------------------------------------------------- #

def evaluate(
    transactions: list[dict[str, Any]],
    rules_override: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    rules = {**DEFAULT_RULES, **(rules_override or {})}
    out: list[Alert] = []
    seen_ids: set[str] = set()

    for tx in transactions:
        if tx.get("chain") not in rules["watched_chains"]:
            continue
        if tx.get("tokenSymbol") in rules["muted_tokens"]:
            continue

        for fn in (_exchange_deposit_alert, _large_transfer_alert):
            a = fn(tx, rules)
            if a and a.id not in seen_ids:
                seen_ids.add(a.id)
                out.append(a)

    out.extend(_rapid_movement_alerts(transactions, rules))

    # Sort: critical first, then high, then by USD desc
    rank = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    out.sort(key=lambda a: (rank.get(a.severity, 9), -a.value_usd))
    return [a.to_dict() for a in out]


# --------------------------------------------------------------------------- #
# Vercel handler                                                              #
# --------------------------------------------------------------------------- #

class handler(BaseHTTPRequestHandler):  # noqa: N801
    def do_POST(self) -> None:  # noqa: N802
        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body or "{}")
            txs = payload.get("transactions") or []
            rules = payload.get("rules")
            alerts = evaluate(txs, rules)
            response = json.dumps({
                "data": alerts,
                "count": len(alerts),
                "status": "computed",
                "provider": "python-alert-engine/1.0",
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(response)
        except Exception as e:  # noqa: BLE001
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": repr(e)}).encode("utf-8"))


# --------------------------------------------------------------------------- #
# CLI                                                                         #
# --------------------------------------------------------------------------- #

def _cli() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--input", help="path to a JSON file with transactions")
    p.add_argument("--rules", help="path to a JSON file overriding rules")
    p.add_argument("--dry-run", action="store_true", help="evaluate sample fixtures and print")
    args = p.parse_args()

    if args.dry_run:
        sample = [
            {
                "hash": "0xabc123",
                "chain": "eth",
                "tokenSymbol": "USDT",
                "type": "exchange_deposit",
                "valueUsd": 5_000_000,
                "fromAddress": "0xfromfromfrom",
                "fromLabel": "Unknown Whale",
                "toLabel": "Binance Hot Wallet",
                "exchange": "Binance",
                "timestamp": "2026-05-16T12:00:00Z",
                "blockExplorerUrl": "https://etherscan.io/tx/0xabc123",
            },
            {
                "hash": "0xdef456",
                "chain": "btc",
                "tokenSymbol": "BTC",
                "type": "transfer",
                "valueUsd": 75_000_000,
                "fromLabel": "Unknown Whale",
                "toLabel": "Unknown",
                "timestamp": "2026-05-16T12:01:00Z",
                "blockExplorerUrl": "https://mempool.space/tx/0xdef456",
            },
        ]
        result = evaluate(sample)
        print(json.dumps(result, indent=2))
        return 0

    if not args.input:
        p.print_help()
        return 1

    with open(args.input) as f:
        txs = json.load(f)
    rules = None
    if args.rules:
        with open(args.rules) as f:
            rules = json.load(f)
    print(json.dumps(evaluate(txs, rules), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(_cli())

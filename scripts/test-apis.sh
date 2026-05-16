#!/usr/bin/env bash
# API smoke test — calls every public /api/* route and asserts envelope shape.
# Reads BASE_URL env or defaults to the live Vercel deployment.
set -euo pipefail

BASE_URL="${BASE_URL:-https://whale-intel-dashboard.vercel.app}"
ROUTES=(
  "/api/whale-transactions?limit=3"
  "/api/exchange-flows"
  "/api/market"
  "/api/stablecoins"
  "/api/funding"
  "/api/open-interest"
  "/api/btc-network"
  "/api/dex-pairs"
  "/api/news"
  "/api/fear-greed"
  "/api/trending"
  "/api/categories"
  "/api/dex-volume"
  "/api/yields"
  "/api/tvl"
  "/api/protocols"
)

PASS=0
FAIL=0

for r in "${ROUTES[@]}"; do
  start=$(date +%s%N)
  body=$(curl -s -m 30 "${BASE_URL}${r}" || echo "{}")
  end=$(date +%s%N)
  lat_ms=$(( (end - start) / 1000000 ))
  status=$(echo "$body" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "parse_err")
  has_data=$(echo "$body" | python3 -c "import json,sys; d=json.load(sys.stdin); print('1' if 'data' in d else '0')" 2>/dev/null || echo "0")
  if [[ "$has_data" == "1" ]]; then
    printf "  ✓ %-44s status=%-10s lat=%dms\n" "$r" "$status" "$lat_ms"
    PASS=$((PASS+1))
  else
    printf "  ✗ %-44s NO ENVELOPE  lat=%dms\n" "$r" "$lat_ms"
    FAIL=$((FAIL+1))
  fi
done

echo
echo "Result: ${PASS} OK, ${FAIL} broken"
exit "$FAIL"

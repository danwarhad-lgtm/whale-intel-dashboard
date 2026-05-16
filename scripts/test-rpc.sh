#!/usr/bin/env bash
# RPC connectivity smoke test. Pings every public-node RPC defined in
# src/lib/onchain-whales.js and prints latency + tip block. Used by CI and
# by AI agents (see AGENTS.md) before claiming a fetch path is working.
set -euo pipefail

declare -A RPCS=(
  [ethereum]="https://ethereum-rpc.publicnode.com"
  [bsc]="https://bsc-rpc.publicnode.com"
  [polygon]="https://polygon-bor-rpc.publicnode.com"
  [arbitrum]="https://arbitrum-one-rpc.publicnode.com"
)

PASS=0
FAIL=0

for name in "${!RPCS[@]}"; do
  url="${RPCS[$name]}"
  start=$(date +%s%N)
  resp=$(curl -s -m 6 -X POST "$url" \
    -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' || true)
  end=$(date +%s%N)
  lat_ms=$(( (end - start) / 1000000 ))
  block_hex=$(echo "$resp" | python3 -c "import json,sys; d=json.load(sys.stdin) if sys.stdin else {}; print(d.get('result') or '')" 2>/dev/null || echo "")
  if [[ -n "$block_hex" && "$block_hex" == 0x* ]]; then
    block_dec=$((16#${block_hex#0x}))
    printf "  ✓ %-10s block=%d  latency=%dms\n" "$name" "$block_dec" "$lat_ms"
    PASS=$((PASS+1))
  else
    printf "  ✗ %-10s FAILED  latency=%dms  resp=%s\n" "$name" "$lat_ms" "${resp:0:80}"
    FAIL=$((FAIL+1))
  fi
done

# Bitcoin via mempool.space
start=$(date +%s%N)
resp=$(curl -s -m 6 "https://mempool.space/api/blocks/tip/height" || true)
end=$(date +%s%N)
lat_ms=$(( (end - start) / 1000000 ))
if [[ "$resp" =~ ^[0-9]+$ ]]; then
  printf "  ✓ %-10s block=%d  latency=%dms\n" "bitcoin" "$resp" "$lat_ms"
  PASS=$((PASS+1))
else
  printf "  ✗ %-10s FAILED  latency=%dms\n" "bitcoin" "$lat_ms"
  FAIL=$((FAIL+1))
fi

echo
echo "Result: ${PASS} healthy, ${FAIL} failing"
exit "$FAIL"

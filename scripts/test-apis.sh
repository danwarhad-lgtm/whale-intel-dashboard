#!/usr/bin/env bash
# Smoke test the 3 free public APIs the dashboard depends on.
# No keys, no signup — anything failing here means the upstream is unhappy.
set -e

probe() {
  local name=$1 url=$2
  local start end
  start=$(date +%s%3N)
  if curl -fsS --max-time 6 -o /dev/null "$url"; then
    end=$(date +%s%3N)
    printf "%-12s OK    %4d ms   %s\n" "$name" "$((end - start))" "$url"
  else
    end=$(date +%s%3N)
    printf "%-12s FAIL  %4d ms   %s\n" "$name" "$((end - start))" "$url"
  fi
}

echo "Probing free public APIs..."
probe coingecko https://api.coingecko.com/api/v3/ping
probe defillama https://api.llama.fi/protocols
probe binance   https://api.binance.com/api/v3/ping

#!/usr/bin/env bash
# Quick local dev launcher.
set -e
cd "$(dirname "$0")/.."
[ -d node_modules ] || npm install --no-audit --no-fund
exec npm run dev

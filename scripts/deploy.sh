#!/usr/bin/env bash
# Build + Vercel deploy. Requires `npx vercel login` once.
set -e
cd "$(dirname "$0")/.."
npm install --no-audit --no-fund
npm run build
npx vercel --prod

# CLAUDE.md — Claude Code Configuration

This file is read by Claude Code (claude.ai/code) when it opens this repository. It complements `AGENTS.md` with Claude-specific conventions and shortcuts.

## Project Snapshot

- **Stack:** Next.js 15 (JS) + Python (serverless) + Go (serverless) + SQL + Bash
- **Deployment:** Vercel
- **Domain:** On-chain crypto intelligence
- **Live:** https://whale-intel-dashboard.vercel.app

## Reading Order

When starting a session, Claude should read in this order:

1. `AGENTS.md` — project operating principles
2. `README.md` — feature surface and architecture
3. `src/lib/onchain-whales.js` — the heart of the app (multi-chain fetcher)
4. `api/score.py` — Python composite scorer
5. The page or hook you're being asked to modify

## Tools Claude Should Prefer

- `read_file` over shell `cat`
- `search_files` over shell `grep` / `find`
- `patch` over rewriting whole files
- `write_file` only when creating a new file

## Common Tasks

### Adding a token to whale tracking

```js
// src/lib/onchain-whales.js — find ERC20_BY_CHAIN, add to the relevant chain
"0xtokenaddress": { symbol: "TOKEN", decimals: 18 },
```

Then add the symbol's USD price to `getPrices()`.

### Labeling a new CEX wallet

```js
// src/lib/onchain-whales.js — find CEX_LABELS
"0xnewhotwallet": "ExchangeName",
```

Use Etherscan's "Name Tag" search to verify the wallet before adding.

### Adding a new dashboard page

1. Create `src/app/<slug>/page.jsx`
2. Create the data hook in `src/lib/hooks/use-<slug>.js`
3. Create the API route in `src/app/api/<slug>/route.js`
4. Wrap the response in `envelope({...})`
5. Add the `<DataSourceBadge>` to the page header
6. Update `src/components/layout/AppSidebar.jsx`

### Investigating a slow request

```bash
# 1. Time each upstream
bash scripts/test-rpc.sh

# 2. Profile the route
curl -w "@scripts/curl-format.txt" -s -o /dev/null https://whale-intel-dashboard.vercel.app/api/whale-transactions

# 3. Check Vercel function logs
vercel logs whale-intel-dashboard.vercel.app --since 30m
```

## What Not To Do

- ❌ Add TypeScript — the project is JS-first to keep serverless cold starts fast.
- ❌ Add `requests` or `httpx` to Python — Vercel size limits; use stdlib `urllib`.
- ❌ Add a paid API — the project's value proposition is free reproducibility.
- ❌ Use `Math.random()` in any API response.
- ❌ Set `output: "export"` in `next.config.mjs`.
- ❌ Forget the AbortController on a `fetch`.

## Hermes Agent / OpenClaw Compatibility

This project's conventions are designed to work cleanly with multiple agents:

- Claude Code reads `CLAUDE.md`
- OpenClaw / Hermes Agent / Cursor read `AGENTS.md`
- Both files share the same operating principles; CLAUDE.md adds Claude-specific tactics

## Composite Score Reference

```
R = 100 × (w₁·V + w₂·F + w₃·D + w₄·S + w₅·W)

V = 1 - σ̂_24h          (volatility, normalized)
F = fearGreedIndex/100  (Alternative.me)
D = btcDominance/0.6    (clamped, healthier ~50%)
S = stableHealthScore   (DefiLlama-derived)
W = 1 - whaleDensity    (live /api/whale-transactions, normalized)

w₁=0.25, w₂=0.20, w₃=0.15, w₄=0.20, w₅=0.20  (sum = 1.0)
```

When updating the formula, edit both `api/score.py` and `src/lib/risk-engine.js`.

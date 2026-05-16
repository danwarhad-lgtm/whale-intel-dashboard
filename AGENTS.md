# AGENTS.md — AI-Driven Development Workflow

This project is built primarily by orchestrating AI coding agents. This file documents the conventions, prompts, and tooling that make that workflow reproducible.

## Why an AGENTS.md

Modern development with AI agents (Claude Code, OpenCode, Hermes Agent, Cursor, Aider) benefits from a project-specific operating manual. Generic AI assistants do not know your repo's conventions, your test commands, or which directories contain user-facing code vs. infrastructure. AGENTS.md fills that gap.

When an agent loads this repo, it should read this file first.

## Project Operating Principles

1. **Real data only.** No `Math.random()` in API responses. If an upstream is unavailable, return `status: "fallback"` with an explicit error string — never silently fake data.
2. **Free APIs only.** Every external dependency must work without an API key. Paid services break reproducibility.
3. **Polyglot by purpose.** Use Python for data math, Go for concurrent I/O, Bash for orchestration, SQL for persistence — but only when each is genuinely the better tool. Don't add a language to look diverse.
4. **Envelope every response.** All `/api/*` routes return `{ data, status, provider, lastUpdated, error }` so the UI can render freshness honestly.
5. **Timeout everything.** Every external `fetch` is wrapped in `AbortController` with a hard deadline. Every RPC has a fallback path.
6. **Cache aggressively, invalidate honestly.** In-memory cache with a TTL on every route handler. Cache hits are marked `status: "cached"`.

## Standard Agent Workflow

When implementing a feature:

1. **Read** the relevant source files first. Never write blind.
2. **Pick the right language.** Heavy IO concurrency → Go. Numerical math → Python. UI/route handling → JS.
3. **Add an `envelope({...})`** to any new API response.
4. **Wire a `DataSourceBadge`** if the page shows live data.
5. **Test with `bash scripts/test-apis.sh`** before claiming done.
6. **Run `pnpm test`** for unit tests on lib changes.
7. **Update README** if you added a public-facing surface.

When fixing a bug:

1. **Reproduce** locally first. Capture the failing curl or screenshot.
2. **Find root cause** — don't patch symptoms.
3. **Add a regression test** in `tests/` if practical.
4. **Verify the fix** with the same reproduction step.

## Commands

| Task                  | Command                          |
| --------------------- | -------------------------------- |
| Dev server            | `pnpm dev`                       |
| Build                 | `pnpm build`                     |
| Unit tests            | `pnpm test`                      |
| API smoke test        | `bash scripts/test-apis.sh`      |
| RPC connectivity test | `bash scripts/test-rpc.sh`      |
| Score test            | `python3 api/score.py --test`    |
| Alert engine test     | `python3 api/alert_engine.py --dry-run` |
| Vercel deploy         | `bash scripts/deploy.sh`         |

## Style Conventions

- **JS:** ES2024, no TypeScript (the project is intentionally JS-first for serverless cold-start). Use named exports.
- **Python:** 3.11+, no third-party deps for serverless functions (Vercel has size limits). Use `urllib.request` + `json` instead of `requests`.
- **Go:** 1.22+. Each file is a self-contained Vercel handler — no shared package.
- **CSS:** Tailwind only. No CSS-in-JS, no Sass.
- **Naming:** kebab-case for files, camelCase for variables, PascalCase for React components.

## On-Chain Conventions

- All chain IDs use lowercase short names: `eth`, `bsc`, `polygon`, `arbitrum`, `btc`.
- All addresses lowercased before label lookup.
- All amounts in whole tokens (not wei) by the time they leave `lib/onchain-whales.js`.
- USD valuations use a 60-second-cached price snapshot — never recompute prices per-tx.

## Adding a New Chain

1. Add an entry to `EVM_CHAINS` in `src/lib/onchain-whales.js` (rpc, explorerTx, native, nativeBlocks, minUsdFloor, maxLogWindow).
2. Add token contracts to `ERC20_BY_CHAIN` for that chain.
3. Add the chain to the `Promise.allSettled` array in `fetchRealWhaleTransactions`.
4. Update README's API table.
5. Run `bash scripts/test-rpc.sh` to verify connectivity.

## Adding a New Risk Sub-Factor

The composite score lives in `api/score.py` (Python) and `src/lib/risk-engine.js` (JS mirror). Both must be updated together.

1. Add the new factor to the formula in both files.
2. Re-derive the weights so they still sum to 1.0.
3. Update the table in README's "Composite Risk Score Formula" section.
4. Add a regression test in `tests/risk-engine.test.js`.

## Pitfalls Discovered During Development

- **Vercel function timeout** for free plan is 10 s. Multi-chain fetcher must complete in under 8 s with margin. Cap log window per chain (`maxLogWindow`) and run all RPC calls in parallel.
- **Public node RPCs occasionally hang** for 10–30 s. AbortController with a 5 s deadline is mandatory.
- **CoinGecko free tier** rate-limits hard. Cache prices for 60 s and use Binance `/ticker/24hr` as a fallback.
- **`window.ethereum`** is not used by this project — it is a read-only research terminal.
- **`output: "export"`** in `next.config.mjs` is incompatible with `dynamic = "force-dynamic"` API routes. Do not add it.
- **`text-foreground` Tailwind class** must be applied to `<input>` elements — without it, typed text is invisible on dark mode.

## How To Ask An Agent To Work On This Repo

A high-quality prompt template for this codebase:

> Read `AGENTS.md` and `README.md` first.
> Then [your specific task].
> Constraints:
> - Free APIs only
> - Wrap fetches in AbortController
> - Return `envelope(...)` shape
> - Add a regression test if you change `lib/onchain-whales.js` or `lib/risk-engine.js`

## Token Usage

This project consumes ~5–8 million tokens per month across coding agents during active development. The dominant model is Claude Sonnet 4 via the Hermes Agent CLI, with MiMo V2.5 for cheap planning passes. See `CLAUDE.md` for Claude-specific configuration notes.

/**
 * Free public API clients — no auth required.
 *  - CoinGecko: api.coingecko.com/api/v3
 *  - DefiLlama: stablecoins.llama.fi
 *  - Binance:   api.binance.com
 */
import { safeFetch } from "./safe-fetch";

const CG_BASE = "https://api.coingecko.com/api/v3";
const DLL_BASE = "https://api.llama.fi";
const DLL_STABLE = "https://stablecoins.llama.fi";
const BINANCE_BASE = "https://api.binance.com";

export async function cgMarkets(perPage = 100, page = 1) {
  const url = `${CG_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=24h,7d`;
  return safeFetch(url, { timeoutMs: 10000, retries: 1 });
}

export async function cgGlobal() {
  return safeFetch(`${CG_BASE}/global`, { timeoutMs: 8000, retries: 1 });
}

export async function cgSimplePrice(ids) {
  const url = `${CG_BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  return safeFetch(url, { timeoutMs: 8000, retries: 1 });
}

export async function cgPing() {
  return safeFetch(`${CG_BASE}/ping`, { timeoutMs: 5000, retries: 0 });
}

export async function dllStablecoins() {
  return safeFetch(`${DLL_STABLE}/stablecoins?includePrices=true`, {
    timeoutMs: 10000,
    retries: 1,
  });
}

export async function dllPing() {
  return safeFetch(`${DLL_BASE}/protocols`, { timeoutMs: 6000, retries: 0 });
}

export async function binanceTicker24h(symbol) {
  return safeFetch(`${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol}`, {
    timeoutMs: 6000,
    retries: 1,
  });
}

export async function binancePing() {
  return safeFetch(`${BINANCE_BASE}/api/v3/ping`, {
    timeoutMs: 4000,
    retries: 0,
  });
}

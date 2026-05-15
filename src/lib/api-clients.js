/**
 * Free public API clients — no auth required.
 *  - CoinGecko: api.coingecko.com/api/v3
 *  - DefiLlama: api.llama.fi + stablecoins.llama.fi + yields.llama.fi
 *  - Binance:   api.binance.com
 *  - Alternative.me: api.alternative.me (Fear & Greed)
 *  - Etherscan: api.etherscan.io (gas oracle, no key needed for some endpoints)
 */
import { safeFetch } from "./safe-fetch";

const CG_BASE = "https://api.coingecko.com/api/v3";
const DLL_BASE = "https://api.llama.fi";
const DLL_STABLE = "https://stablecoins.llama.fi";
const DLL_YIELDS = "https://yields.llama.fi";
const DLL_BRIDGES = "https://bridges.llama.fi";
const BINANCE_BASE = "https://api.binance.com";
const ALT_BASE = "https://api.alternative.me";

/* ============ CoinGecko ============ */
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

export async function cgTrending() {
  return safeFetch(`${CG_BASE}/search/trending`, { timeoutMs: 8000, retries: 1 });
}

export async function cgCategories() {
  return safeFetch(`${CG_BASE}/coins/categories`, { timeoutMs: 8000, retries: 1 });
}

export async function cgCoin(id) {
  return safeFetch(
    `${CG_BASE}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
    { timeoutMs: 10000, retries: 1 },
  );
}

/* ============ DefiLlama ============ */
export async function dllStablecoins() {
  return safeFetch(`${DLL_STABLE}/stablecoins?includePrices=true`, {
    timeoutMs: 10000,
    retries: 1,
  });
}

export async function dllProtocols() {
  return safeFetch(`${DLL_BASE}/protocols`, { timeoutMs: 12000, retries: 1 });
}

export async function dllChains() {
  return safeFetch(`${DLL_BASE}/v2/chains`, { timeoutMs: 10000, retries: 1 });
}

export async function dllOverviewDexs() {
  return safeFetch(
    `${DLL_BASE}/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
    { timeoutMs: 12000, retries: 1 },
  );
}

export async function dllYieldPools() {
  return safeFetch(`${DLL_YIELDS}/pools`, { timeoutMs: 12000, retries: 1 });
}

export async function dllPing() {
  return safeFetch(`${DLL_BASE}/protocols`, { timeoutMs: 6000, retries: 0 });
}

/* ============ Binance ============ */
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

/* ============ Alternative.me Fear & Greed ============ */
export async function altFearGreed(limit = 30) {
  return safeFetch(`${ALT_BASE}/fng/?limit=${limit}`, {
    timeoutMs: 8000,
    retries: 1,
  });
}

/* ============ Owlracle gas tracker (free, no auth, multi-chain) ============ */
export async function owlracleGas(chain = "eth") {
  return safeFetch(`https://api.owlracle.info/v4/${chain}/gas`, {
    timeoutMs: 8000,
    retries: 1,
  });
}

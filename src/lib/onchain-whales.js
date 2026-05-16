/**
 * Real on-chain whale data fetcher.
 *
 * Sources (all free, no API key):
 *  - ETH:      ethereum-rpc.publicnode.com  (eth_getBlockByNumber, eth_getLogs)
 *  - BSC:      bsc-rpc.publicnode.com
 *  - Polygon:  polygon-bor-rpc.publicnode.com
 *  - Arbitrum: arbitrum-one-rpc.publicnode.com
 *  - BTC:      mempool.space public REST API
 *  - Prices:   CoinGecko /simple/price
 *
 * Pulls latest blocks, extracts large native + ERC20 transfers, normalizes
 * into the same shape the dashboard already renders.
 */

import { cacheGet, cacheSet } from "./api-helpers.js";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Per-chain RPC endpoint + block explorer + native symbol + min USD whale floor.
// BSC/Polygon are mostly retail, so we lower the floor there to surface real
// activity. ETH/Arbitrum see actual whale moves at higher tickets.
//
// maxLogWindow caps the eth_getLogs span per chain — fast chains like BSC/Polygon
// produce way more logs per block than ETH and a 30-block ask there will time
// out a public RPC. ETH gets the full window so exchange-flows can scan ~6min
// of activity; others stay tight.
const EVM_CHAINS = {
  eth: {
    rpc: "https://ethereum-rpc.publicnode.com",
    explorerTx: "https://etherscan.io/tx/",
    native: "ETH",
    nativeBlocks: 4,
    minUsdFloor: 100_000,
    maxLogWindow: 30,
  },
  bsc: {
    rpc: "https://bsc-rpc.publicnode.com",
    explorerTx: "https://bscscan.com/tx/",
    native: "BNB",
    nativeBlocks: 4,
    minUsdFloor: 25_000,
    maxLogWindow: 8,
  },
  polygon: {
    rpc: "https://polygon-bor-rpc.publicnode.com",
    explorerTx: "https://polygonscan.com/tx/",
    native: "MATIC",
    nativeBlocks: 4,
    minUsdFloor: 25_000,
    maxLogWindow: 8,
  },
  arbitrum: {
    rpc: "https://arbitrum-one-rpc.publicnode.com",
    explorerTx: "https://arbiscan.io/tx/",
    native: "ETH",
    nativeBlocks: 4,
    minUsdFloor: 50_000,
    maxLogWindow: 8,
  },
};

// Per-chain ERC20 contracts to monitor (lowercased addresses)
const ERC20_BY_CHAIN = {
  eth: {
    "0xdac17f958d2ee523a2206206994597c13d831ec7": { symbol: "USDT", decimals: 6 },
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { symbol: "USDC", decimals: 6 },
    "0x6b175474e89094c44da98b954eedeac495271d0f": { symbol: "DAI", decimals: 18 },
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": { symbol: "WBTC", decimals: 8 },
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { symbol: "WETH", decimals: 18 },
  },
  bsc: {
    "0x55d398326f99059ff775485246999027b3197955": { symbol: "USDT", decimals: 18 },
    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": { symbol: "USDC", decimals: 18 },
    "0xe9e7cea3dedca5984780bafc599bd69add087d56": { symbol: "BUSD", decimals: 18 },
    "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": { symbol: "BTCB", decimals: 18 },
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8": { symbol: "ETH", decimals: 18 },
  },
  polygon: {
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": { symbol: "USDT", decimals: 6 },
    "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": { symbol: "USDC", decimals: 6 },
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": { symbol: "USDC.e", decimals: 6 },
    "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063": { symbol: "DAI", decimals: 18 },
    "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6": { symbol: "WBTC", decimals: 8 },
    "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619": { symbol: "WETH", decimals: 18 },
  },
  arbitrum: {
    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": { symbol: "USDT", decimals: 6 },
    "0xaf88d065e77c8cc2239327c5edb3a432268e5831": { symbol: "USDC", decimals: 6 },
    "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8": { symbol: "USDC.e", decimals: 6 },
    "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1": { symbol: "DAI", decimals: 18 },
    "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f": { symbol: "WBTC", decimals: 8 },
    "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": { symbol: "WETH", decimals: 18 },
  },
};

// Known CEX hot wallets (lowercased). Used both for labels and exchange-flow
// classification. ETH-native list — most CEX hot wallets reuse the same
// address across EVM chains, so this map applies cross-chain.
const CEX_LABELS = {
  // Binance
  "0x28c6c06298d514db089934071355e5743bf21d60": "Binance",
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance",
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance",
  "0x56eddb7aa87536c09ccc2793473599fd21a8b17f": "Binance",
  "0x9696f59e4d72e237be84ffd425dcad154bf96976": "Binance",
  "0x4976a4a02f38326660d17bf34b431dc6e2eb2327": "Binance",
  "0xd551234ae421e3bcba99a0da6d736074f22192ff": "Binance",
  "0x564286362092d8e7936f0549571a803b203aaced": "Binance",
  "0x0681d8db095565fe8a346fa0277bffde9c0edbbf": "Binance",
  "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance",
  "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance",
  "0x85b931a32a0725be14285b66f1a22178c672d69b": "Binance",
  "0x8894e0a0c962cb723c1976a4421c95949be2d4e3": "Binance",
  "0xeb2629a2734e272bcc07bda959863f316f4bd4cf": "Binance",
  // Coinbase
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": "Coinbase",
  "0x503828976d22510aad0201ac7ec88293211d23da": "Coinbase",
  "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": "Coinbase",
  "0x3cd751e6b0078be393132286c442345e5dc49699": "Coinbase",
  "0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511": "Coinbase",
  "0xa090e606e30bd747d4e6245a1517ebe430f0057e": "Coinbase",
  "0x77696bb39917c91a0c3908d577d5e322095425ca": "Coinbase",
  "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": "Coinbase",
  // Kraken
  "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": "Kraken",
  "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": "Kraken",
  "0xfa52274dd61e1643d2205169732f29114bc240b3": "Kraken",
  "0xe853c56864a2ebe4576a807d26fdc4a0ada63919": "Kraken",
  // OKX
  "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b": "OKX",
  "0xa7efae728d2936e78bda97dc267687568dd593f3": "OKX",
  "0x236f9f97e0e62388479bf9e5ba4889e46b0273c3": "OKX",
  // Bybit
  "0xf89d7b9c864f589bbf53a82105107622b35eaa40": "Bybit",
  "0xee5b5b923ffce93a870b3104b7ca09c3db80047a": "Bybit",
  // Bitfinex
  "0x1151314c646ce4e0efd76d1af4760ae66a9fe30f": "Bitfinex",
  "0x876eabf441b2ee5b5b0554fd502a8e0600950cfa": "Bitfinex",
  // KuCoin
  "0x2b5634c42055806a59e9107ed44d43c426e58258": "KuCoin",
  "0x689c56aef474df92d44a1b70850f808488f9769c": "KuCoin",
  // Crypto.com
  "0x46340b20830761efd32832a74d7169b29feb9758": "Crypto.com",
  "0x6262998ced04146fa42253a5c0af90ca02dfd2a3": "Crypto.com",
  // BSC-specific Binance wallets
  "0x8894e0a0c962cb723c1976a4421c95949be2d4e3": "Binance",
  "0xf68a4b64162906eff5fb7e3c70f9d2d0334c4f2a": "Binance",
  "0x73f5ebe90f27b46ea12e5795d16c4b408b19cc6f": "Binance",
};

function labelFor(addr) {
  if (!addr) return null;
  return CEX_LABELS[addr.toLowerCase()] ?? null;
}

function severityFromUsd(usd) {
  if (usd >= 50_000_000) return "critical";
  if (usd >= 10_000_000) return "high";
  if (usd >= 2_000_000) return "medium";
  if (usd >= 500_000) return "low";
  return "info";
}

async function rpc(rpcUrl, method, params, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

async function getPrices() {
  const cached = cacheGet("prices");
  if (cached) return cached;
  const ids =
    "bitcoin,ethereum,binancecoin,matic-network,polygon-pos,wrapped-bitcoin";
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const j = await res.json();
  const prices = {
    BTC: j.bitcoin?.usd ?? 70000,
    ETH: j.ethereum?.usd ?? 2200,
    BNB: j.binancecoin?.usd ?? 600,
    MATIC: j["matic-network"]?.usd ?? j["polygon-pos"]?.usd ?? 0.5,
    WBTC: j["wrapped-bitcoin"]?.usd ?? j.bitcoin?.usd ?? 70000,
    WETH: j.ethereum?.usd ?? 2200,
    BTCB: j.bitcoin?.usd ?? 70000, // BSC wrapped BTC
    USDT: 1,
    USDC: 1,
    "USDC.e": 1,
    BUSD: 1,
    DAI: 1,
  };
  cacheSet("prices", prices, 60_000);
  return prices;
}

function classifyType(fromLabel, toLabel) {
  if (toLabel) return "exchange_deposit";
  if (fromLabel) return "exchange_withdrawal";
  return "transfer";
}

/**
 * Generic EVM whale fetcher used by ETH/BSC/Polygon/Arbitrum.
 *
 * All RPC calls (native block walk + per-token getLogs) run in parallel and
 * have a 6s timeout each. Native walks are capped per-chain — public RPCs
 * rate-limit large tx-body responses, and stable-coin logs cover most volume.
 * Failures on individual RPCs are swallowed so a slow chain doesn't take the
 * whole feed down.
 */
async function fetchEvmWhales(chainKey, prices, blockWindow, minUsd) {
  const conf = EVM_CHAINS[chainKey];
  const tokens = ERC20_BY_CHAIN[chainKey];
  if (!conf || !tokens) return [];
  // Use the higher of caller's minUsd and the chain's whale floor so cheap-tx
  // chains like BSC/Polygon surface activity instead of going empty.
  const floor = Math.max(minUsd, conf.minUsdFloor);
  // Cap log window per chain — public RPCs on BSC/Polygon/Arb time out on
  // wide ranges. ETH gets the full window for exchange-flows accuracy.
  const effectiveWindow = Math.min(blockWindow, conf.maxLogWindow);
  let tipHex;
  try {
    tipHex = await rpc(conf.rpc, "eth_blockNumber", []);
  } catch (e) {
    return [];
  }
  const tip = parseInt(tipHex, 16);
  const txs = [];

  const nativePrice = prices[conf.native] ?? 0;
  const nativeCount = Math.min(effectiveWindow, conf.nativeBlocks);

  // Parallel native block fetches
  const nativePromises = [];
  for (let i = 0; i < nativeCount; i++) {
    const numHex = "0x" + (tip - i).toString(16);
    nativePromises.push(
      rpc(conf.rpc, "eth_getBlockByNumber", [numHex, true]).catch(() => null),
    );
  }

  // Parallel ERC20 log fetches
  const fromBlock = "0x" + (tip - effectiveWindow + 1).toString(16);
  const toBlock = tipHex;
  const tokenEntries = Object.entries(tokens);
  const tokenPromises = tokenEntries.map(([addr]) =>
    rpc(conf.rpc, "eth_getLogs", [
      { address: addr, fromBlock, toBlock, topics: [TRANSFER_TOPIC] },
    ]).catch(() => []),
  );

  const [nativeBlocks, ...tokenResults] = await Promise.all([
    Promise.all(nativePromises),
    ...tokenPromises,
  ]);

  // Process native blocks
  for (const block of nativeBlocks) {
    if (!block) continue;
    const tsMs = parseInt(block.timestamp, 16) * 1000;
    for (const t of block.transactions) {
      const valWei = BigInt(t.value || "0x0");
      if (valWei === 0n) continue;
      const native = Number(valWei) / 1e18;
      const usd = native * nativePrice;
      if (usd < floor) continue;
      const fromLabel = labelFor(t.from);
      const toLabel = labelFor(t.to);
      const type = classifyType(fromLabel, toLabel);
      txs.push({
        id: `${chainKey}_${t.hash}`,
        hash: t.hash,
        chain: chainKey,
        tokenSymbol: conf.native,
        type,
        severity: severityFromUsd(usd),
        valueUsd: Math.round(usd),
        fromAddress: t.from,
        fromLabel: fromLabel ? `${fromLabel} Hot Wallet` : "Unknown Whale",
        toAddress: t.to ?? "0x0000000000000000000000000000000000000000",
        toLabel: toLabel ? `${toLabel} Hot Wallet` : "Unknown",
        exchange: toLabel ?? fromLabel ?? null,
        timestamp: new Date(tsMs).toISOString(),
        blockExplorerUrl: `${conf.explorerTx}${t.hash}`,
      });
    }
  }

  // Process ERC20 logs
  for (let i = 0; i < tokenEntries.length; i++) {
    const [, meta] = tokenEntries[i];
    const logs = tokenResults[i] || [];
    for (const L of logs) {
      const raw = BigInt(L.data || "0x0");
      const amount = Number(raw) / 10 ** meta.decimals;
      const usd = amount * (prices[meta.symbol] ?? 0);
      if (usd < floor) continue;
      const from = "0x" + L.topics[1].slice(-40);
      const to = "0x" + L.topics[2].slice(-40);
      const fromLabel = labelFor(from);
      const toLabel = labelFor(to);
      const type = classifyType(fromLabel, toLabel);
      txs.push({
        id: `${chainKey}_${L.transactionHash}_${L.logIndex}`,
        hash: L.transactionHash,
        chain: chainKey,
        tokenSymbol: meta.symbol,
        type,
        severity: severityFromUsd(usd),
        valueUsd: Math.round(usd),
        fromAddress: from,
        fromLabel: fromLabel ? `${fromLabel} Hot Wallet` : "Unknown Whale",
        toAddress: to,
        toLabel: toLabel ? `${toLabel} Hot Wallet` : "Unknown",
        exchange: toLabel ?? fromLabel ?? null,
        timestamp: new Date().toISOString(),
        blockExplorerUrl: `${conf.explorerTx}${L.transactionHash}`,
      });
    }
  }
  return txs;
}

async function fetchBtcWhales(prices, minUsd = 500_000) {
  const blocksRes = await fetch("https://mempool.space/api/v1/blocks", {
    cache: "no-store",
  });
  if (!blocksRes.ok) return [];
  const blocks = await blocksRes.json();
  const items = [];
  for (const b of blocks.slice(0, 2)) {
    const txsRes = await fetch(
      `https://mempool.space/api/block/${b.id}/txs/0`,
      { cache: "no-store" },
    );
    if (!txsRes.ok) continue;
    const txs = await txsRes.json();
    for (const t of txs) {
      const totalSat = (t.vout || []).reduce(
        (acc, v) => acc + (v.value || 0),
        0,
      );
      const btc = totalSat / 1e8;
      const usd = btc * prices.BTC;
      if (usd < minUsd) continue;
      if ((t.vin || [])[0]?.is_coinbase) continue;
      const from = t.vin?.[0]?.prevout?.scriptpubkey_address ?? "n/a";
      const to = t.vout?.[0]?.scriptpubkey_address ?? "n/a";
      items.push({
        id: `btc_${t.txid}`,
        hash: t.txid,
        chain: "btc",
        tokenSymbol: "BTC",
        type: "transfer",
        severity: severityFromUsd(usd),
        valueUsd: Math.round(usd),
        fromAddress: from,
        fromLabel: "Unknown Whale",
        toAddress: to,
        toLabel: "Unknown",
        exchange: null,
        timestamp: new Date(b.timestamp * 1000).toISOString(),
        blockExplorerUrl: `https://mempool.space/tx/${t.txid}`,
      });
    }
  }
  return items;
}

/**
 * Fetch real whale transactions across ETH + BSC + Polygon + Arbitrum + BTC.
 * Cached per (limit, minUsd, blockWindow). Returns at most `limit` items.
 *
 * blockWindow controls the EVM log scan range. Larger window = better chance
 * of catching CEX flows but more RPC weight. cacheTtlMs lets callers tune
 * how long the result is cached (e.g. exchange-flows uses a longer cache).
 */
export async function fetchRealWhaleTransactions({
  limit = 80,
  minUsd = 250_000,
  blockWindow = 4,
  cacheTtlMs = 60_000,
} = {}) {
  const cacheKey = `whales_${limit}_${minUsd}_${blockWindow}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const prices = await getPrices();

  const settled = await Promise.allSettled([
    fetchEvmWhales("eth", prices, blockWindow, minUsd),
    fetchEvmWhales("bsc", prices, blockWindow, minUsd),
    fetchEvmWhales("polygon", prices, blockWindow, minUsd),
    fetchEvmWhales("arbitrum", prices, blockWindow, minUsd),
    fetchBtcWhales(prices, Math.max(minUsd, 500_000)),
  ]);

  const all = [];
  for (const s of settled) {
    if (s.status === "fulfilled" && Array.isArray(s.value)) all.push(...s.value);
  }

  if (!all.length) {
    throw new Error("No whale data available from upstream sources");
  }

  // De-dupe by id and sort by USD value desc, then trim to limit
  const seen = new Set();
  const out = [];
  all.sort((a, b) => b.valueUsd - a.valueUsd);
  for (const t of all) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
    if (out.length >= limit) break;
  }

  // Re-sort final result by timestamp desc so the table reads as a feed
  out.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  cacheSet(cacheKey, out, cacheTtlMs);
  return out;
}

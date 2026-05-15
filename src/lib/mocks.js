/**
 * Mulberry32 PRNG + deterministic mocks for whales, exchanges, market, stables.
 * All mocks are seeded by the current hour so refreshes feel realistic but
 * stable for a given hour window.
 */

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hourSeed(saltKey = "") {
  const hour = Math.floor(Date.now() / (1000 * 60 * 60));
  let h = hour;
  for (let i = 0; i < saltKey.length; i++) {
    h = (h * 31 + saltKey.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function rangeNum(rng, min, max) {
  return min + rng() * (max - min);
}

/* --------------------- Whale transactions --------------------- */

const CHAINS = ["eth", "btc", "bsc", "tron", "sol"];
const TYPES = [
  "transfer",
  "exchange_deposit",
  "exchange_withdrawal",
  "mint",
  "burn",
];

const TOKENS_BY_CHAIN = {
  eth: ["ETH", "USDT", "USDC", "WBTC", "DAI", "LINK", "UNI"],
  btc: ["BTC"],
  bsc: ["BNB", "USDT", "USDC", "BUSD"],
  tron: ["USDT", "TRX"],
  sol: ["SOL", "USDC", "USDT"],
};

const EXCHANGES = [
  "Binance",
  "Coinbase",
  "Kraken",
  "OKX",
  "Bybit",
  "Bitfinex",
  "KuCoin",
];

const LABELS = [
  "Unknown Whale",
  "Smart Money",
  "DeFi Treasury",
  "MEV Bot",
  "Cold Storage",
  "Bridge Contract",
  "Stablecoin Issuer",
  "Market Maker",
  "Foundation",
];

const EXPLORERS = {
  eth: "https://etherscan.io/tx/",
  btc: "https://www.blockchain.com/btc/tx/",
  bsc: "https://bscscan.com/tx/",
  tron: "https://tronscan.org/#/transaction/",
  sol: "https://solscan.io/tx/",
};

function severityFromUsd(usd) {
  if (usd >= 50_000_000) return "critical";
  if (usd >= 10_000_000) return "high";
  if (usd >= 2_000_000) return "medium";
  if (usd >= 500_000) return "low";
  return "info";
}

function hexAddress(rng, length = 40) {
  let s = "0x";
  const chars = "0123456789abcdef";
  for (let i = 0; i < length; i++) s += chars[Math.floor(rng() * chars.length)];
  return s;
}

function txHash(rng, chain) {
  const len = chain === "btc" ? 64 : chain === "sol" ? 88 : 64;
  if (chain === "sol") {
    const chars =
      "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[Math.floor(rng() * chars.length)];
    return s;
  }
  return hexAddress(rng, len).slice(2);
}

export function generateMockWhaleTransactions(count = 50) {
  const seed = hourSeed("whale");
  const rng = mulberry32(seed);
  const items = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const chain = pick(rng, CHAINS);
    const tokenSymbol = pick(rng, TOKENS_BY_CHAIN[chain]);
    const type = pick(rng, TYPES);
    const valueUsd = Math.round(rangeNum(rng, 250_000, 90_000_000));
    const fromAddress = hexAddress(rng);
    const toAddress = hexAddress(rng);
    let exchange = null;
    let fromLabel = pick(rng, LABELS);
    let toLabel = pick(rng, LABELS);
    if (type === "exchange_deposit") {
      exchange = pick(rng, EXCHANGES);
      toLabel = `${exchange} Hot Wallet`;
    } else if (type === "exchange_withdrawal") {
      exchange = pick(rng, EXCHANGES);
      fromLabel = `${exchange} Hot Wallet`;
    } else if (type === "mint" || type === "burn") {
      fromLabel = type === "mint" ? "Issuer Treasury" : "Burn Address";
      toLabel = type === "mint" ? "Distribution Wallet" : "Issuer Treasury";
    }
    const hash = txHash(rng, chain);
    const timestamp = new Date(
      now - Math.floor(rangeNum(rng, 0, 24 * 60 * 60 * 1000))
    ).toISOString();
    items.push({
      id: `whale_${i.toString().padStart(4, "0")}`,
      hash,
      chain,
      tokenSymbol,
      type,
      severity: severityFromUsd(valueUsd),
      valueUsd,
      fromAddress,
      fromLabel,
      toAddress,
      toLabel,
      exchange,
      timestamp,
      blockExplorerUrl: `${EXPLORERS[chain]}${hash}`,
    });
  }
  return items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/* --------------------- Exchange flows --------------------- */

export const MOCK_EXCHANGES = [
  "Binance",
  "Coinbase",
  "Kraken",
  "OKX",
  "Bybit",
  "Bitfinex",
  "KuCoin",
];
export const MOCK_TOKENS = ["BTC", "ETH", "USDT", "USDC", "SOL", "BNB", "XRP"];

export function generateMockExchangeFlows() {
  const seed = hourSeed("exchange-flows");

  const summary = MOCK_EXCHANGES.map((ex, i) => {
    const rng = mulberry32(seed + i * 101);
    const baseSize =
      ex === "Binance"
        ? 4_500_000_000
        : ex === "Coinbase"
        ? 2_400_000_000
        : ex === "OKX"
        ? 1_800_000_000
        : ex === "Bybit"
        ? 1_500_000_000
        : ex === "Kraken"
        ? 1_200_000_000
        : 800_000_000;
    const inflowUsd = Math.round(baseSize * rangeNum(rng, 0.4, 0.8));
    const outflowUsd = Math.round(baseSize * rangeNum(rng, 0.4, 0.8));
    return {
      exchange: ex,
      inflowUsd,
      outflowUsd,
      netflowUsd: outflowUsd - inflowUsd,
      txCount: Math.round(rangeNum(rng, 200, 6000)),
    };
  });

  const byToken = [];
  MOCK_EXCHANGES.forEach((ex, i) => {
    MOCK_TOKENS.forEach((tk, j) => {
      const rng = mulberry32(seed + i * 53 + j * 7);
      const tokenWeight =
        tk === "BTC" || tk === "USDT"
          ? 1.0
          : tk === "ETH" || tk === "USDC"
          ? 0.7
          : 0.4;
      const exWeight =
        ex === "Binance" ? 1.0 : ex === "Coinbase" ? 0.55 : 0.35;
      const base = 220_000_000 * tokenWeight * exWeight;
      const inflowUsd = Math.round(base * rangeNum(rng, 0.4, 1.2));
      const outflowUsd = Math.round(base * rangeNum(rng, 0.4, 1.2));
      byToken.push({
        exchange: ex,
        token: tk,
        inflowUsd,
        outflowUsd,
        netflowUsd: outflowUsd - inflowUsd,
      });
    });
  });

  const history = [];
  const now = Date.now();
  for (let d = 29; d >= 0; d--) {
    const rng = mulberry32(seed + d * 211);
    const ts = new Date(now - d * 24 * 60 * 60 * 1000).toISOString();
    const baseInflow = 9_000_000_000 + Math.sin(d / 4) * 2_000_000_000;
    const baseOutflow = 8_500_000_000 + Math.cos(d / 3) * 1_800_000_000;
    history.push({
      timestamp: ts,
      inflow: Math.round(baseInflow * rangeNum(rng, 0.85, 1.15)),
      outflow: Math.round(baseOutflow * rangeNum(rng, 0.85, 1.15)),
    });
  }

  return { summary, byToken, history };
}

/* --------------------- Market data --------------------- */

const MARKET_TOKENS = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", basePrice: 64750, baseRank: 1, category: "Layer 1" },
  { id: "ethereum", symbol: "eth", name: "Ethereum", basePrice: 3160, baseRank: 2, category: "Layer 1" },
  { id: "tether", symbol: "usdt", name: "Tether", basePrice: 1.0001, baseRank: 3, category: "Stablecoin" },
  { id: "binancecoin", symbol: "bnb", name: "BNB", basePrice: 580, baseRank: 4, category: "Exchange Token" },
  { id: "solana", symbol: "sol", name: "Solana", basePrice: 168, baseRank: 5, category: "Layer 1" },
  { id: "usd-coin", symbol: "usdc", name: "USD Coin", basePrice: 0.9998, baseRank: 6, category: "Stablecoin" },
  { id: "xrp", symbol: "xrp", name: "XRP", basePrice: 0.62, baseRank: 7, category: "Layer 1" },
  { id: "dogecoin", symbol: "doge", name: "Dogecoin", basePrice: 0.16, baseRank: 8, category: "Meme" },
  { id: "cardano", symbol: "ada", name: "Cardano", basePrice: 0.45, baseRank: 9, category: "Layer 1" },
  { id: "tron", symbol: "trx", name: "TRON", basePrice: 0.13, baseRank: 10, category: "Layer 1" },
  { id: "avalanche-2", symbol: "avax", name: "Avalanche", basePrice: 36, baseRank: 11, category: "Layer 1" },
  { id: "shiba-inu", symbol: "shib", name: "Shiba Inu", basePrice: 0.000022, baseRank: 12, category: "Meme" },
  { id: "polkadot", symbol: "dot", name: "Polkadot", basePrice: 6.4, baseRank: 13, category: "Layer 1" },
  { id: "chainlink", symbol: "link", name: "Chainlink", basePrice: 13.8, baseRank: 14, category: "DeFi" },
  { id: "matic-network", symbol: "matic", name: "Polygon", basePrice: 0.71, baseRank: 15, category: "Layer 1" },
  { id: "wrapped-bitcoin", symbol: "wbtc", name: "Wrapped Bitcoin", basePrice: 64600, baseRank: 16, category: "DeFi" },
  { id: "uniswap", symbol: "uni", name: "Uniswap", basePrice: 7.3, baseRank: 17, category: "DeFi" },
  { id: "litecoin", symbol: "ltc", name: "Litecoin", basePrice: 78, baseRank: 18, category: "Layer 1" },
  { id: "internet-computer", symbol: "icp", name: "Internet Computer", basePrice: 9.4, baseRank: 19, category: "Layer 1" },
  { id: "dai", symbol: "dai", name: "Dai", basePrice: 1.0001, baseRank: 20, category: "Stablecoin" },
];

function buildSparkline(rng, base) {
  const points = [];
  let v = base;
  for (let i = 0; i < 168; i++) {
    const drift = (rng() - 0.5) * (base * 0.012);
    const wave = Math.sin(i / 6 + rng() * 2) * (base * 0.005);
    v = Math.max(0.0000001, v + drift + wave);
    points.push(Number(v.toFixed(base < 1 ? 8 : 2)));
  }
  return points;
}

export function generateMockMarketData() {
  const seed = hourSeed("market");
  return MARKET_TOKENS.map((t, idx) => {
    const rng = mulberry32(seed + idx * 37);
    const change24h =
      t.category === "Stablecoin" ? (rng() - 0.5) * 0.08 : (rng() - 0.5) * 12;
    const change7d =
      t.category === "Stablecoin" ? (rng() - 0.5) * 0.2 : (rng() - 0.5) * 24;
    const drift = 1 + change24h / 100;
    const current_price = Number(
      (t.basePrice * drift).toFixed(t.basePrice < 1 ? 8 : 2)
    );
    const market_cap = Math.round(
      current_price * (1e10 * (21 - t.baseRank) + 1e9)
    );
    const total_volume = Math.round(market_cap * (0.04 + rng() * 0.16));
    const sparkline = buildSparkline(rng, t.basePrice);
    return {
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      image: `https://assets.coingecko.com/coins/images/${100 + idx}/large/${t.id}.png`,
      current_price,
      market_cap,
      market_cap_rank: t.baseRank,
      total_volume,
      price_change_percentage_24h: Number(change24h.toFixed(2)),
      price_change_percentage_7d_in_currency: Number(change7d.toFixed(2)),
      sparkline_in_7d: { price: sparkline },
      category: t.category,
    };
  });
}

/* --------------------- Stablecoins --------------------- */

const STABLE_SEEDS = [
  { id: "tether", symbol: "USDT", name: "Tether", baseCap: 121_000_000_000, baseVol: 38_000_000_000 },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin", baseCap: 36_000_000_000, baseVol: 7_000_000_000 },
  { id: "dai", symbol: "DAI", name: "Dai", baseCap: 5_300_000_000, baseVol: 320_000_000 },
  { id: "first-digital-usd", symbol: "FDUSD", name: "First Digital USD", baseCap: 3_100_000_000, baseVol: 4_100_000_000 },
  { id: "paypal-usd", symbol: "PYUSD", name: "PayPal USD", baseCap: 720_000_000, baseVol: 24_000_000 },
  { id: "true-usd", symbol: "TUSD", name: "TrueUSD", baseCap: 510_000_000, baseVol: 18_000_000 },
];

export function generateMockStablecoins() {
  const seed = hourSeed("stablecoins");
  return STABLE_SEEDS.map((s, i) => {
    const rng = mulberry32(seed + i * 43);
    const isVolatile = s.symbol === "TUSD";
    const dev = isVolatile
      ? (rng() - 0.5) * 0.02
      : (rng() - 0.5) * 0.006;
    const price = Number((1 + dev).toFixed(4));
    const marketCap = Math.round(s.baseCap * rangeNum(rng, 0.95, 1.05));
    const volume24h = Math.round(s.baseVol * rangeNum(rng, 0.7, 1.3));
    return {
      id: s.id,
      symbol: s.symbol,
      name: s.name,
      price,
      pegDeviationPct: Number(dev.toFixed(6)),
      marketCap,
      volume24h,
      supply: marketCap,
    };
  });
}

/* --------------------- Alert factories --------------------- */

export function alertsFromWhale(txs, minUsd = 5_000_000) {
  return txs
    .filter((t) => t.valueUsd >= minUsd)
    .slice(0, 10)
    .map((t) => ({
      id: `alert_whale_${t.id}`,
      type: "whale",
      severity: t.severity,
      title: `${t.severity.toUpperCase()} whale ${t.type.replace("_", " ")}`,
      message: `$${(t.valueUsd / 1_000_000).toFixed(1)}M ${t.tokenSymbol} on ${t.chain.toUpperCase()} (${t.fromLabel} → ${t.toLabel})`,
      tokenSymbol: t.tokenSymbol,
      exchange: t.exchange ?? null,
      valueUsd: t.valueUsd,
      source: "engine",
      createdAt: t.timestamp,
    }));
}

export function alertsFromExchangeFlow(snapshot) {
  const out = [];
  for (const row of snapshot.summary) {
    const ratio = row.inflowUsd / Math.max(1, row.inflowUsd + row.outflowUsd);
    if (ratio > 0.62 && row.inflowUsd > 1_000_000_000) {
      out.push({
        id: `alert_flow_in_${row.exchange}`,
        type: "exchange_flow",
        severity: ratio > 0.7 ? "high" : "medium",
        title: `Net inflow surge on ${row.exchange}`,
        message: `Inflow $${(row.inflowUsd / 1e9).toFixed(2)}B vs outflow $${(row.outflowUsd / 1e9).toFixed(2)}B (last 24h)`,
        exchange: row.exchange,
        valueUsd: row.inflowUsd,
        source: "engine",
        createdAt: new Date().toISOString(),
      });
    } else if (ratio < 0.38) {
      out.push({
        id: `alert_flow_out_${row.exchange}`,
        type: "exchange_flow",
        severity: "low",
        title: `Strong withdrawal trend on ${row.exchange}`,
        message: `Outflow $${(row.outflowUsd / 1e9).toFixed(2)}B vs inflow $${(row.inflowUsd / 1e9).toFixed(2)}B (last 24h)`,
        exchange: row.exchange,
        valueUsd: row.outflowUsd,
        source: "engine",
        createdAt: new Date().toISOString(),
      });
    }
  }
  return out.slice(0, 5);
}

export function alertsFromStablecoins(stables, threshold = 0.005) {
  return stables
    .filter((s) => Math.abs(s.pegDeviationPct) >= threshold)
    .map((s) => ({
      id: `alert_stable_${s.symbol}`,
      type: "stablecoin_depeg",
      severity:
        Math.abs(s.pegDeviationPct) >= 0.01
          ? "high"
          : Math.abs(s.pegDeviationPct) >= 0.005
          ? "medium"
          : "low",
      title: `${s.symbol} peg deviation ${(s.pegDeviationPct * 100).toFixed(2)}%`,
      message: `${s.name} trading at $${s.price.toFixed(4)} — drift ${(s.pegDeviationPct * 100).toFixed(2)}% from $1`,
      tokenSymbol: s.symbol,
      source: "engine",
      createdAt: new Date().toISOString(),
    }));
}

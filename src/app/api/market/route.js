import { NextResponse } from "next/server";
import { cgGlobal, cgMarkets, binanceTicker24h } from "@/lib/api-clients";
import { generateMockMarketData } from "@/lib/mocks";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const CACHE_KEY = "market";
const CACHE_TTL = 45_000;

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached);
  }

  const [globalRes, marketsRes] = await Promise.all([cgGlobal(), cgMarkets(20)]);

  if (globalRes.ok && marketsRes.ok) {
    const g = globalRes.data?.data;
    const coins = (marketsRes.data ?? []).map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.image,
      current_price: c.current_price,
      market_cap: c.market_cap,
      market_cap_rank: c.market_cap_rank,
      total_volume: c.total_volume,
      price_change_percentage_24h: c.price_change_percentage_24h,
      price_change_percentage_7d_in_currency:
        c.price_change_percentage_7d_in_currency,
      sparkline_in_7d: c.sparkline_in_7d,
    }));
    const data = {
      global: {
        totalMarketCap: g?.total_market_cap?.usd ?? 0,
        totalVolume: g?.total_volume?.usd ?? 0,
        btcDominance: g?.market_cap_percentage?.btc ?? 0,
        ethDominance: g?.market_cap_percentage?.eth ?? 0,
        marketCapChange24h: g?.market_cap_change_percentage_24h_usd ?? 0,
        activeCryptos: g?.active_cryptocurrencies ?? 0,
      },
      coins,
    };
    const env = envelope({
      data,
      status: "live",
      provider: "coingecko",
    });
    cacheSet(CACHE_KEY, env, CACHE_TTL);
    return NextResponse.json(env);
  }

  // Fallback to Binance + mocks
  const [btcRes, ethRes] = await Promise.all([
    binanceTicker24h("BTCUSDT"),
    binanceTicker24h("ETHUSDT"),
  ]);
  const coins = generateMockMarketData();
  if (btcRes.ok) {
    const t = btcRes.data;
    const idx = coins.findIndex((c) => c.symbol === "btc");
    if (idx >= 0) {
      coins[idx] = {
        ...coins[idx],
        current_price: parseFloat(t.lastPrice),
        price_change_percentage_24h: parseFloat(t.priceChangePercent),
        total_volume: parseFloat(t.quoteVolume),
      };
    }
  }
  if (ethRes.ok) {
    const t = ethRes.data;
    const idx = coins.findIndex((c) => c.symbol === "eth");
    if (idx >= 0) {
      coins[idx] = {
        ...coins[idx],
        current_price: parseFloat(t.lastPrice),
        price_change_percentage_24h: parseFloat(t.priceChangePercent),
        total_volume: parseFloat(t.quoteVolume),
      };
    }
  }
  const data = {
    global: {
      totalMarketCap: coins.reduce((acc, c) => acc + c.market_cap, 0),
      totalVolume: coins.reduce((acc, c) => acc + c.total_volume, 0),
      btcDominance: 51.2,
      ethDominance: 17.4,
      marketCapChange24h: 0,
      activeCryptos: coins.length,
    },
    coins,
  };
  const env = envelope({
    data,
    status: btcRes.ok || ethRes.ok ? "fallback" : "fallback",
    provider: btcRes.ok || ethRes.ok ? "binance+mock" : "mock",
    error: globalRes.error || marketsRes.error,
  });
  cacheSet(CACHE_KEY, env, 30_000);
  return NextResponse.json(env);
}

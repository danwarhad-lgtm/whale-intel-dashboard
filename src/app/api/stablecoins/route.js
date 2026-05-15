import { NextResponse } from "next/server";
import { cgSimplePrice, dllStablecoins } from "@/lib/api-clients";
import { generateMockStablecoins } from "@/lib/mocks";
import { calculateStablecoinHealthScore } from "@/lib/scoring";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const CACHE_KEY = "stablecoins";
const TRACKED = [
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin" },
  { id: "dai", symbol: "DAI", name: "Dai" },
  { id: "first-digital-usd", symbol: "FDUSD", name: "First Digital USD" },
  { id: "paypal-usd", symbol: "PYUSD", name: "PayPal USD" },
  { id: "true-usd", symbol: "TUSD", name: "TrueUSD" },
];

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  const [priceRes, llamaRes] = await Promise.all([
    cgSimplePrice(TRACKED.map((t) => t.id)),
    dllStablecoins(),
  ]);

  let items = generateMockStablecoins();
  let status = "fallback";
  let provider = "mock";

  if (priceRes.ok) {
    const px = priceRes.data ?? {};
    const llamaMap = new Map();
    if (llamaRes.ok) {
      for (const a of llamaRes.data?.peggedAssets ?? []) {
        llamaMap.set(a.symbol.toUpperCase(), a);
      }
    }
    items = TRACKED.map((t) => {
      const p = px[t.id];
      const price = p?.usd ?? 1;
      const dev = price - 1;
      const llama = llamaMap.get(t.symbol);
      const cap = llama?.circulating?.peggedUSD ?? 0;
      return {
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        price: Number(price.toFixed(4)),
        pegDeviationPct: Number(dev.toFixed(6)),
        marketCap: cap,
        volume24h: 0,
        supply: cap,
      };
    });
    status = llamaRes.ok ? "live" : "fallback";
    provider = llamaRes.ok ? "coingecko+defillama" : "coingecko";
  }

  const totalCap = items.reduce((acc, s) => acc + (s.marketCap || 0), 0);
  const dominance = items.map((s) => ({
    symbol: s.symbol,
    share: totalCap > 0 ? s.marketCap / totalCap : 0,
  }));
  const healthScore = calculateStablecoinHealthScore(items);

  const env = envelope({
    data: { items, healthScore, dominance, totalCap },
    status,
    provider,
    error: !priceRes.ok ? priceRes.error : null,
  });
  cacheSet(CACHE_KEY, env, 90_000);
  return NextResponse.json(env);
}

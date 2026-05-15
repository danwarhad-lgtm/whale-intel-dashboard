import { NextResponse } from "next/server";
import { cgSimplePrice } from "@/lib/api-clients";
import { generateMockMarketData } from "@/lib/mocks";
import { envelope } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const SYMBOL_TO_ID = {
  btc: "bitcoin",
  eth: "ethereum",
  usdt: "tether",
  bnb: "binancecoin",
  sol: "solana",
  usdc: "usd-coin",
  xrp: "xrp",
  doge: "dogecoin",
  ada: "cardano",
  trx: "tron",
  avax: "avalanche-2",
  shib: "shiba-inu",
  dot: "polkadot",
  link: "chainlink",
  matic: "matic-network",
  wbtc: "wrapped-bitcoin",
  uni: "uniswap",
  ltc: "litecoin",
  icp: "internet-computer",
  dai: "dai",
};

export async function GET(_req, { params }) {
  const symbolRaw = (await params).symbol;
  const symbol = decodeURIComponent(symbolRaw).toLowerCase();
  const mocks = generateMockMarketData();
  const fromMock = mocks.find(
    (m) => m.symbol === symbol || m.id === symbol,
  );

  const id = SYMBOL_TO_ID[symbol] ?? fromMock?.id ?? symbol;
  const live = await cgSimplePrice([id]);
  if (live.ok && live.data?.[id]) {
    const p = live.data[id];
    const data = {
      ...(fromMock ?? {}),
      id,
      symbol,
      current_price: p.usd,
      price_change_percentage_24h: p.usd_24h_change,
    };
    return NextResponse.json(
      envelope({ data, status: "live", provider: "coingecko" }),
    );
  }

  if (fromMock) {
    return NextResponse.json(
      envelope({ data: fromMock, status: "fallback", provider: "mock" }),
    );
  }

  return NextResponse.json(
    envelope({
      data: null,
      status: "error",
      error: `Token ${symbol} not found`,
    }),
    { status: 404 },
  );
}

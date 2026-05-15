import { NextResponse } from "next/server";
import { cgCoinDetail, cgCoinChart } from "@/lib/api-clients";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { id } = await params;
  const url = new URL(req.url);
  const days = url.searchParams.get("days") || "30";
  const key = `coin:${id}:${days}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);
  const [detailRes, chartRes] = await Promise.all([cgCoinDetail(id), cgCoinChart(id, days)]);
  if (!detailRes.ok) {
    return NextResponse.json(envelope({ data: null, status: "error", error: detailRes.error }));
  }
  const c = detailRes.data ?? {};
  const md = c.market_data ?? {};
  const detail = {
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    image: c.image?.large,
    description: c.description?.en?.split(". ").slice(0, 3).join(". ") ?? null,
    categories: c.categories ?? [],
    links: {
      homepage: (c.links?.homepage ?? []).filter(Boolean)[0] ?? null,
      twitter: c.links?.twitter_screen_name ? `https://twitter.com/${c.links.twitter_screen_name}` : null,
      telegram: c.links?.telegram_channel_identifier ? `https://t.me/${c.links.telegram_channel_identifier}` : null,
      reddit: c.links?.subreddit_url ?? null,
      github: (c.links?.repos_url?.github ?? [])[0] ?? null,
      explorer: (c.links?.blockchain_site ?? []).filter(Boolean)[0] ?? null,
      whitepaper: c.links?.whitepaper ?? null,
    },
    rank: c.market_cap_rank,
    genesis: c.genesis_date,
    hashingAlgo: c.hashing_algorithm,
    sentiment: { up: c.sentiment_votes_up_percentage, down: c.sentiment_votes_down_percentage },
    market: {
      price: md.current_price?.usd ?? 0,
      mcap: md.market_cap?.usd ?? 0,
      fdv: md.fully_diluted_valuation?.usd ?? null,
      volume24h: md.total_volume?.usd ?? 0,
      ath: md.ath?.usd ?? 0,
      athDate: md.ath_date?.usd,
      athChange: md.ath_change_percentage?.usd ?? 0,
      atl: md.atl?.usd ?? 0,
      atlDate: md.atl_date?.usd,
      atlChange: md.atl_change_percentage?.usd ?? 0,
      circSupply: md.circulating_supply,
      totalSupply: md.total_supply,
      maxSupply: md.max_supply,
      change24h: md.price_change_percentage_24h ?? 0,
      change7d: md.price_change_percentage_7d ?? 0,
      change30d: md.price_change_percentage_30d ?? 0,
      change1y: md.price_change_percentage_1y ?? 0,
      high24h: md.high_24h?.usd ?? 0,
      low24h: md.low_24h?.usd ?? 0,
    },
    chart: chartRes.ok ? {
      prices: (chartRes.data?.prices ?? []).map(([t, v]) => ({ t, v })),
      volumes: (chartRes.data?.total_volumes ?? []).map(([t, v]) => ({ t, v })),
      mcaps: (chartRes.data?.market_caps ?? []).map(([t, v]) => ({ t, v })),
    } : null,
  };
  const env = envelope({ data: detail, status: "live", provider: "coingecko" });
  cacheSet(key, env, 2 * 60_000);
  return NextResponse.json(env);
}

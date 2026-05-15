import { NextResponse } from "next/server";
import { envelope, cacheGet, cacheSet } from "@/lib/api-helpers";
import { safeFetch } from "@/lib/safe-fetch";

export const dynamic = "force-dynamic";
const CACHE_KEY = "news";
const CACHE_TTL = 5 * 60_000;

const FEEDS = [
  { name: "CoinDesk", rss: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", rss: "https://cointelegraph.com/rss" },
  { name: "Decrypt", rss: "https://decrypt.co/feed" },
  { name: "Bitcoin Magazine", rss: "https://bitcoinmagazine.com/.rss/full/" },
];

function extractItems(xml, source, max = 12) {
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const tagText = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (!m) return null;
    return m[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
  };
  let match;
  while ((match = itemRegex.exec(xml)) && items.length < max) {
    const block = match[0];
    const title = tagText(block, "title");
    const link = tagText(block, "link");
    const pubDate = tagText(block, "pubDate");
    const desc = tagText(block, "description");
    if (title && link) {
      items.push({
        title,
        link,
        source,
        pubDate,
        description: desc?.replace(/<[^>]+>/g, "").substring(0, 240),
      });
    }
  }
  return items;
}

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  const results = await Promise.allSettled(
    FEEDS.map((f) => safeFetch(f.rss, { timeoutMs: 8000, retries: 1, parseJson: false })),
  );
  const all = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.ok && typeof r.value.data === "string") {
      all.push(...extractItems(r.value.data, FEEDS[i].name));
    }
  });
  all.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
  const env = envelope({
    data: { items: all.slice(0, 60) },
    status: all.length > 0 ? "live" : "error",
    provider: "rss-multi",
  });
  cacheSet(CACHE_KEY, env, CACHE_TTL);
  return NextResponse.json(env);
}

"use client";
import { useQuery } from "@tanstack/react-query";

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useTokenDetail(symbol) {
  return useQuery({
    queryKey: ["token-detail", symbol],
    enabled: Boolean(symbol),
    queryFn: () => fetchJson(`/api/market/${encodeURIComponent(symbol)}`),
  });
}

"use client";
import { useQuery } from "@tanstack/react-query";

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useMarketData() {
  return useQuery({
    queryKey: ["market"],
    queryFn: () => fetchJson("/api/market"),
    refetchInterval: 60_000,
  });
}

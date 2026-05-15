"use client";
import { useQuery } from "@tanstack/react-query";

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useExchangeFlows(filters = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "" && v !== "all") {
      params.set(k, String(v));
    }
  }
  const qs = params.toString();
  return useQuery({
    queryKey: ["exchange-flows", filters],
    queryFn: () => fetchJson(`/api/exchange-flows${qs ? `?${qs}` : ""}`),
    refetchInterval: 120_000,
  });
}

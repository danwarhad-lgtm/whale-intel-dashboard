"use client";
import { useQuery } from "@tanstack/react-query";

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useApiStatus() {
  return useQuery({
    queryKey: ["api-status"],
    queryFn: () => fetchJson("/api/health-proxy"),
    refetchInterval: 60_000,
    retry: 0,
  });
}

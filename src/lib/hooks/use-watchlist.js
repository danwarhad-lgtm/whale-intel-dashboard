"use client";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  getWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
} from "@/lib/storage";
import { useMarketData } from "./use-market-data";

function newId() {
  return `wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function useWatchlist() {
  const [items, setItems] = useState([]);
  const market = useMarketData();

  useEffect(() => {
    setItems(getWatchlist());
    const onStorage = (e) => {
      if (e.key === "whale-intel.watchlist") setItems(getWatchlist());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const enriched = useMemo(() => {
    const coins = market.data?.data?.coins ?? [];
    return items.map((it) => {
      const coin = coins.find(
        (c) =>
          c.symbol.toLowerCase() === it.symbol.toLowerCase() ||
          c.id === it.coingeckoId,
      );
      return {
        ...it,
        price: coin?.current_price ?? null,
        change24h: coin?.price_change_percentage_24h ?? null,
        marketCap: coin?.market_cap ?? null,
        sparkline: coin?.sparkline_in_7d?.price ?? null,
        image: coin?.image,
      };
    });
  }, [items, market.data]);

  return { items: enriched, refresh: () => setItems(getWatchlist()) };
}

export function useAddWatchlistItem() {
  return useMutation({
    mutationFn: async (input) => {
      const item = {
        id: input.id ?? newId(),
        symbol: input.symbol,
        name: input.name ?? input.symbol,
        coingeckoId: input.coingeckoId,
        addedAt: new Date().toISOString(),
        note: input.note ?? "",
      };
      return addWatchlistItem(item);
    },
  });
}

export function useRemoveWatchlistItem() {
  return useMutation({
    mutationFn: async (id) => removeWatchlistItem(id),
  });
}

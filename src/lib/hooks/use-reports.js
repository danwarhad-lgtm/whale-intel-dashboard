"use client";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  getReports,
  addReport,
  deleteReport,
  clearReports,
} from "@/lib/storage";
import { useMarketData } from "./use-market-data";
import { useWhaleTransactions } from "./use-whale-transactions";
import { useExchangeFlows } from "./use-exchange-flows";
import { useStablecoins } from "./use-stablecoins";

function newId() {
  return `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function useReports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    setReports(getReports());
    const onStorage = (e) => {
      if (e.key === "whale-intel.reports") setReports(getReports());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { reports, refresh: () => setReports(getReports()) };
}

export function useGenerateReport() {
  const market = useMarketData();
  const whales = useWhaleTransactions({ limit: 50 });
  const flows = useExchangeFlows();
  const stables = useStablecoins();

  return useMutation({
    mutationFn: async ({ period = "24h", title } = {}) => {
      const marketData = market.data?.data;
      const whaleData = whales.data?.data;
      const flowData = flows.data?.data;
      const stableData = stables.data?.data;

      const totalVolume = whaleData?.summary?.totalVolume ?? 0;
      const criticalCount = whaleData?.summary?.criticalCount ?? 0;
      const exchangeDeposits = whaleData?.summary?.exchangeDeposits ?? 0;
      const exchangeWithdrawals = whaleData?.summary?.exchangeWithdrawals ?? 0;
      const totalInflow = (flowData?.summary ?? []).reduce(
        (acc, r) => acc + (r.inflowUsd ?? 0),
        0,
      );
      const totalOutflow = (flowData?.summary ?? []).reduce(
        (acc, r) => acc + (r.outflowUsd ?? 0),
        0,
      );
      const stableHealth = stableData?.healthScore?.score ?? 0;
      const btc = marketData?.coins?.find((c) => c.symbol === "btc");
      const eth = marketData?.coins?.find((c) => c.symbol === "eth");

      const report = {
        id: newId(),
        title: title ?? `Whale Intel — ${period} digest`,
        createdAt: new Date().toISOString(),
        period,
        summary: {
          totalWhaleVolume: totalVolume,
          criticalCount,
          exchangeDeposits,
          exchangeWithdrawals,
          totalInflow,
          totalOutflow,
          stableHealth,
          btcChange24h: btc?.price_change_percentage_24h ?? 0,
          ethChange24h: eth?.price_change_percentage_24h ?? 0,
        },
        highlights: [
          { name: "Whale volume", value: totalVolume },
          { name: "Critical events", value: criticalCount },
          { name: "Exchange inflow", value: totalInflow },
          { name: "Exchange outflow", value: totalOutflow },
          { name: "Stablecoin health", value: stableHealth },
          { name: "BTC 24h %", value: btc?.price_change_percentage_24h ?? 0 },
          { name: "ETH 24h %", value: eth?.price_change_percentage_24h ?? 0 },
        ],
      };
      return addReport(report);
    },
  });
}

export function useDeleteReport() {
  return useMutation({
    mutationFn: async (id) => deleteReport(id),
  });
}

export function useClearReports() {
  return useMutation({
    mutationFn: async () => clearReports(),
  });
}

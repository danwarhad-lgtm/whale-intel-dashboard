"use client";
import { useEffect, useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  getAlerts,
  addAlert,
  deleteAlert,
  clearAlerts,
  markAlertRead,
} from "@/lib/storage";

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    setAlerts(getAlerts());
    const onStorage = (e) => {
      if (e.key === "whale-intel.alerts") setAlerts(getAlerts());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refresh = useCallback(() => setAlerts(getAlerts()), []);

  return { alerts, refresh };
}

export function useAddAlert() {
  return useMutation({
    mutationFn: async (input) => {
      const alert = {
        id: input.id ?? newId(),
        type: input.type ?? "custom",
        severity: input.severity ?? "info",
        title: input.title ?? "Custom alert",
        message: input.message ?? "",
        tokenSymbol: input.tokenSymbol,
        exchange: input.exchange ?? null,
        valueUsd: input.valueUsd,
        source: input.source ?? "user",
        createdAt: input.createdAt ?? nowIso(),
        read: false,
      };
      return addAlert(alert);
    },
  });
}

export function useDeleteAlert() {
  return useMutation({
    mutationFn: async (id) => deleteAlert(id),
  });
}

export function useMarkAlertRead() {
  return useMutation({
    mutationFn: async (id) => markAlertRead(id),
  });
}

export function useClearAlerts() {
  return useMutation({
    mutationFn: async () => clearAlerts(),
  });
}

export function useGenerateTestAlert() {
  return useMutation({
    mutationFn: async () => {
      const samples = [
        {
          type: "whale",
          severity: "high",
          title: "HIGH whale exchange deposit",
          message: "$24.6M USDT moved to Binance Hot Wallet",
          tokenSymbol: "USDT",
        },
        {
          type: "stablecoin_depeg",
          severity: "medium",
          title: "TUSD peg deviation 0.86%",
          message: "TrueUSD trading at $0.9914",
          tokenSymbol: "TUSD",
        },
        {
          type: "exchange_flow",
          severity: "high",
          title: "Net inflow surge on Coinbase",
          message: "Inflow $2.10B vs outflow $1.05B (last 24h)",
          exchange: "Coinbase",
        },
      ];
      const sample = samples[Math.floor(Math.random() * samples.length)];
      return addAlert({
        id: newId(),
        ...sample,
        source: "test",
        createdAt: nowIso(),
        read: false,
      });
    },
  });
}

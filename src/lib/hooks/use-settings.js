"use client";
import { useEffect, useState, useCallback } from "react";
import { getSettings, setSetting, setSettings } from "@/lib/storage";
import { useMutation } from "@tanstack/react-query";

export function useSettings() {
  const [state, setState] = useState(() => getSettings());

  useEffect(() => {
    setState(getSettings());
    const onStorage = (e) => {
      if (e.key === "whale-intel.settings") {
        setState(getSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((partial) => {
    const next = setSettings(partial);
    setState(next);
    return next;
  }, []);

  return { ...state, update };
}

export function useUpdateSetting() {
  return useMutation({
    mutationFn: async ({ key, value }) => {
      return setSetting(key, value);
    },
  });
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: async (partial) => {
      return setSettings(partial);
    },
  });
}

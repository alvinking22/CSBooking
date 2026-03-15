"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { PublicConfig } from "@/types";
import { hexToForeground } from "@/lib/utils";

interface ConfigContextValue {
  config: PublicConfig | null;
  loading: boolean;
  refreshConfig: () => void;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: null,
  loading: true,
  refreshConfig: () => {},
});

export function ConfigProvider({
  children,
  initialConfig,
}: {
  children: ReactNode;
  initialConfig: PublicConfig | null;
}) {
  const [config, setConfig] = useState<PublicConfig | null>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Apply dynamic CSS variables when config changes
  useEffect(() => {
    if (!config) return;

    const primary = config.primaryColor || "#3B82F6";
    document.documentElement.style.setProperty("--primary", primary);
    document.documentElement.style.setProperty("--primary-foreground", hexToForeground(primary));
    document.documentElement.style.setProperty("--ring", primary);

    if (config.businessName) {
      document.title = config.businessName;
    }
  }, [config]);

  // Re-fetch when refreshKey changes (after admin settings update)
  useEffect(() => {
    if (refreshKey === 0) return;
    setLoading(true);
    fetch("/api/config/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) setConfig(data.config);
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const refreshConfig = () => setRefreshKey((k) => k + 1);

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

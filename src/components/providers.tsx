"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { ConfigProvider } from "@/contexts/ConfigContext";
import type { PublicConfig } from "@/types";
import type { ReactNode } from "react";

export function Providers({
  children,
  config,
}: {
  children: ReactNode;
  config: PublicConfig | null;
}) {
  return (
    <SessionProvider>
      <ConfigProvider initialConfig={config}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "10px",
              background: "#333",
              color: "#fff",
            },
          }}
        />
        {children}
      </ConfigProvider>
    </SessionProvider>
  );
}

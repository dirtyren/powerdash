"use client";

import { createContext, useContext, type ReactNode } from "react";

export type RefreshIntervalMs = number | null;

const RefreshIntervalContext = createContext<RefreshIntervalMs>(null);

export function RefreshIntervalProvider({
  value,
  children,
}: {
  value: RefreshIntervalMs;
  children: ReactNode;
}) {
  return (
    <RefreshIntervalContext.Provider value={value}>
      {children}
    </RefreshIntervalContext.Provider>
  );
}

export function useRefreshInterval(): RefreshIntervalMs {
  return useContext(RefreshIntervalContext);
}

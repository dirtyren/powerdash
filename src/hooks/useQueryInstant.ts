"use client";

import { useQuery } from "@tanstack/react-query";
import type { PromInstantResponse } from "@/server/schemas/prometheus";
import { useRefreshInterval } from "@/contexts/RefreshIntervalContext";
import { resolveRefetchInterval } from "@/hooks/resolve-refetch-interval";

export interface QueryInstantOptions {
  time?: number;
  refetchIntervalMs?: number | null;
}

async function fetchInstant(
  expr: string,
  opts: QueryInstantOptions,
): Promise<PromInstantResponse> {
  const r = await fetch("/api/promql/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ expr, time: opts.time }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PromQL query failed: ${r.status} ${text}`);
  }
  return (await r.json()) as PromInstantResponse;
}

export function useQueryInstant(expr: string, opts: QueryInstantOptions = {}) {
  const ctx = useRefreshInterval();
  const refetchInterval = resolveRefetchInterval(opts.refetchIntervalMs, ctx);
  return useQuery({
    queryKey: ["promql-instant", expr, opts.time],
    queryFn: () => fetchInstant(expr, opts),
    refetchInterval,
    enabled: expr.trim().length > 0,
  });
}

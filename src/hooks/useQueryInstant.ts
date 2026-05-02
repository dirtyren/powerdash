"use client";

import { useQuery } from "@tanstack/react-query";
import type { PromInstantResponse } from "@/server/schemas/prometheus";

export interface QueryInstantOptions {
  time?: number;
  refetchIntervalMs?: number;
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
  return useQuery({
    queryKey: ["promql-instant", expr, opts.time],
    queryFn: () => fetchInstant(expr, opts),
    refetchInterval: opts.refetchIntervalMs ?? 15_000,
    enabled: expr.trim().length > 0,
  });
}

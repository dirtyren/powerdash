"use client";

import { useQuery } from "@tanstack/react-query";
import type { PromRangeResponse } from "@/server/schemas/prometheus";

export interface QueryRangeOptions {
  start?: number;           // unix seconds
  end?: number;
  step?: number;            // seconds
  refetchIntervalMs?: number;
}

async function fetchRange(
  expr: string,
  opts: QueryRangeOptions,
): Promise<PromRangeResponse> {
  const r = await fetch("/api/promql/query_range", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      expr,
      start: opts.start,
      end: opts.end,
      step: opts.step,
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PromQL query_range failed: ${r.status} ${text}`);
  }
  return (await r.json()) as PromRangeResponse;
}

export function useQueryRange(expr: string, opts: QueryRangeOptions = {}) {
  return useQuery({
    queryKey: ["promql-range", expr, opts.start, opts.end, opts.step],
    queryFn: () => fetchRange(expr, opts),
    refetchInterval: opts.refetchIntervalMs ?? 15_000,
  });
}

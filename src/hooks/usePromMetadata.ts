"use client";

import { useQuery } from "@tanstack/react-query";
import { createPromClient } from "@/widgets/promql/prom-client";

const STALE_MINUTES = 5;
const STALE_MS = STALE_MINUTES * 60 * 1000;

export function useMetricNames() {
  return useQuery({
    queryKey: ["promql-metric-names"],
    queryFn: () => createPromClient().metricNames(),
    staleTime: STALE_MS,
  });
}

export function useLabelNames() {
  return useQuery({
    queryKey: ["promql-label-names"],
    queryFn: () => createPromClient().labelNames(),
    staleTime: STALE_MS,
  });
}

export function useLabelValues(labelName: string | null) {
  return useQuery({
    queryKey: ["promql-label-values", labelName],
    queryFn: () =>
      labelName ? createPromClient().labelValues(labelName) : Promise.resolve([]),
    enabled: !!labelName,
    staleTime: STALE_MS,
  });
}

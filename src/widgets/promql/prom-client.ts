"use client";

import type { PrometheusClient } from "@prometheus-io/codemirror-promql";

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(path, { credentials: "include" });
  if (!r.ok) {
    throw new Error(`${path} → ${r.status}`);
  }
  return (await r.json()) as T;
}

export function createPromClient(): PrometheusClient {
  return {
    async labelNames(): Promise<string[]> {
      const { data } = await getJson<{ data: string[] }>("/api/promql/labels");
      return data;
    },
    async labelValues(labelName: string): Promise<string[]> {
      const { data } = await getJson<{ data: string[] }>(
        `/api/promql/label/${encodeURIComponent(labelName)}/values`,
      );
      return data;
    },
    async metricNames(): Promise<string[]> {
      const { data } = await getJson<{ data: string[] }>(
        `/api/promql/label/${encodeURIComponent("__name__")}/values`,
      );
      return data;
    },
    async metricMetadata() {
      const { data } = await getJson<{
        data: Record<string, Array<{ type: string; help: string; unit: string }>>;
      }>("/api/promql/metadata");
      return data;
    },
    series() {
      // Matcher-scoped lookup is deferred to a later phase.
      return Promise.resolve([]);
    },
    flags() {
      return Promise.resolve({});
    },
  };
}

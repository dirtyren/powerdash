"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardSummary } from "@/server/schemas/dashboard";

async function fetchDashboards(): Promise<DashboardSummary[]> {
  const r = await fetch("/api/dashboards", { credentials: "include" });
  if (!r.ok) throw new Error(`list dashboards failed: ${r.status}`);
  const data: DashboardSummary[] = (await r.json()) as DashboardSummary[];
  return data;
}

export function useDashboards() {
  return useQuery({
    queryKey: ["dashboards"],
    queryFn: fetchDashboards,
  });
}

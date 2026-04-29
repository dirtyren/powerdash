"use client";

import { useQuery } from "@tanstack/react-query";
import type { Dashboard } from "@/server/schemas/dashboard";

async function fetchDashboard(id: string): Promise<Dashboard> {
  const r = await fetch(`/api/dashboards/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`get dashboard ${id} failed: ${r.status}`);
  const data: Dashboard = (await r.json()) as Dashboard;
  return data;
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => fetchDashboard(id),
    enabled: Boolean(id),
  });
}

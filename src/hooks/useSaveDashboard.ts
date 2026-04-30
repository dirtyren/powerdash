"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Dashboard } from "@/server/schemas/dashboard";
import type { WidgetRef } from "@/server/schemas/widget";

export interface SaveDashboardInput {
  widgets: WidgetRef[];
  name?: string;
}

async function saveDashboardApi(id: string, input: SaveDashboardInput): Promise<Dashboard> {
  const r = await fetch(`/api/dashboards/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`save failed: ${r.status} ${text}`);
  }
  const data: Dashboard = (await r.json()) as Dashboard;
  return data;
}

export function useSaveDashboard(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveDashboardInput) => saveDashboardApi(id, input),
    onSuccess: (saved) => {
      qc.setQueryData(["dashboard", id], saved);
      void qc.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });
}

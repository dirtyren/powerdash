"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Dashboard } from "@/server/schemas/dashboard";
import type { WidgetRef } from "@/server/schemas/widget";

async function saveDashboardApi(id: string, widgets: WidgetRef[]): Promise<Dashboard> {
  const r = await fetch(`/api/dashboards/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ widgets }),
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
    mutationFn: (widgets: WidgetRef[]) => saveDashboardApi(id, widgets),
    onSuccess: (saved) => {
      qc.setQueryData(["dashboard", id], saved);
      void qc.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Dashboard, CreateDashboard } from "@/server/schemas/dashboard";

async function createDashboardApi(draft: CreateDashboard): Promise<Dashboard> {
  const r = await fetch("/api/dashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(draft),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`create failed: ${r.status} ${text}`);
  }
  return (await r.json()) as Dashboard;
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: CreateDashboard) => createDashboardApi(draft),
    onSuccess: (saved) => {
      qc.setQueryData(["dashboard", saved.id], saved);
      void qc.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });
}

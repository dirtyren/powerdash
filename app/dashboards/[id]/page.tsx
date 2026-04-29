"use client";

import { use } from "react";
import { AppShell } from "@/components/AppShell";
import { DashboardGrid } from "@/components/DashboardGrid";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useDashboard(id);

  return (
    <AppShell>
      {isLoading && <p className="text-muted-foreground">Loading dashboard…</p>}
      {error && <p className="text-red-400">Failed to load dashboard: {error.message}</p>}
      {data && (
        <>
          <header className="mb-6 flex items-baseline justify-between">
            <h1 className="text-2xl font-semibold">{data.name}</h1>
            <span className="text-muted-foreground text-sm">owner: {data.owner}</span>
          </header>
          <DashboardGrid widgets={data.widgets} />
        </>
      )}
    </AppShell>
  );
}

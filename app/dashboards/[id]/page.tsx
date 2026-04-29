"use client";

import { use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardCanvas } from "@/components/DashboardCanvas";
import { useDashboard } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/button";
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
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">owner: {data.owner}</span>
              <Link href={`/dashboards/${id}/edit`}>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </Link>
            </div>
          </header>
          <DashboardCanvas width={data.width} height={data.height} widgets={data.widgets} />
        </>
      )}
    </AppShell>
  );
}

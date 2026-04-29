"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EditableDashboardGrid } from "@/components/EditableDashboardGrid";
import { EditToolbar } from "@/components/EditToolbar";
import { useDashboard } from "@/hooks/useDashboard";
import { useSaveDashboard } from "@/hooks/useSaveDashboard";
import type { WidgetRef } from "@/server/schemas/widget";
import type { Route } from "next";

function stableKey(widgets: WidgetRef[]): string {
  return JSON.stringify(
    widgets.map((w) => [w.id, w.kind, w.title, w.x, w.y, w.w, w.h]),
  );
}

export default function DashboardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useDashboard(id);
  const save = useSaveDashboard(id);

  const [editWidgets, setEditWidgets] = useState<WidgetRef[] | null>(null);

  useEffect(() => {
    if (data && editWidgets === null) {
      setEditWidgets(data.widgets);
    }
  }, [data, editWidgets]);

  const isDirty = useMemo(() => {
    if (!data || editWidgets === null) return false;
    return stableKey(editWidgets) !== stableKey(data.widgets);
  }, [data, editWidgets]);

  const viewHref = `/dashboards/${id}` as Route;

  const handleSave = () => {
    if (editWidgets === null) return;
    save.mutate(editWidgets, {
      onSuccess: () => {
        router.push(viewHref);
      },
    });
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard unsaved changes?")) return;
    router.push(viewHref);
  };

  return (
    <AppShell>
      {isLoading && <p className="text-muted-foreground">Loading dashboard…</p>}
      {error && (
        <p className="text-red-400">
          Failed to load dashboard: {error.message}
        </p>
      )}
      {save.error && (
        <p className="text-red-400">
          Save failed: {save.error.message}
        </p>
      )}
      {data && editWidgets !== null && (
        <>
          <EditToolbar
            title={data.name}
            isDirty={isDirty}
            isSaving={save.isPending}
            onSave={handleSave}
            onCancel={handleCancel}
          />
          <EditableDashboardGrid
            widgets={editWidgets}
            onChange={setEditWidgets}
          />
        </>
      )}
    </AppShell>
  );
}

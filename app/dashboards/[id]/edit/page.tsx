"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { EditableDashboardCanvas } from "@/components/EditableDashboardCanvas";
import { EditToolbar } from "@/components/EditToolbar";
import { WidgetPalette } from "@/components/WidgetPalette";
import { QueryEditor } from "@/components/widgets/QueryEditor";
import type { WidgetAdapter } from "@/widgets/adapter";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/useDashboard";
import { useSaveDashboard } from "@/hooks/useSaveDashboard";
import type { WidgetRef, WidgetQuery } from "@/server/schemas/widget";
import type { Route } from "next";

function stableKey(widgets: WidgetRef[]): string {
  return JSON.stringify(
    widgets.map((w) => [
      w.id,
      w.kind,
      w.title,
      w.x,
      w.y,
      w.w,
      w.h,
      w.query ?? null,
    ]),
  );
}

export default function DashboardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, error } = useDashboard(id);
  const save = useSaveDashboard(id);

  const [editWidgets, setEditWidgets] = useState<WidgetRef[] | null>(null);
  const [editName, setEditName] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState<boolean>(true);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  const selectedWidget =
    editWidgets !== null && selectedWidgetId !== null
      ? editWidgets.find((w) => w.id === selectedWidgetId) ?? null
      : null;

  const handleApplyQuery =
    (widgetId: string) => (next: WidgetQuery | undefined) => {
      if (editWidgets === null) return;
      setEditWidgets(
        editWidgets.map((w) =>
          w.id === widgetId
            ? {
                ...w,
                ...(next !== undefined ? { query: next } : { query: undefined }),
              }
            : w,
        ),
      );
    };

  useEffect(() => {
    if (data && editWidgets === null) {
      setEditWidgets(data.widgets);
      setEditName(data.name);
    }
  }, [data, editWidgets]);

  const isDirty = useMemo(() => {
    if (!data || editWidgets === null || editName === null) return false;
    return (
      editName !== data.name ||
      stableKey(editWidgets) !== stableKey(data.widgets)
    );
  }, [data, editWidgets, editName]);

  const viewHref = `/dashboards/${id}` as Route;

  const handleSave = () => {
    if (editWidgets === null || editName === null) return;
    const snapshot = editWidgets;
    save.mutate(
      { widgets: snapshot, name: editName },
      {
        onSuccess: (saved) => {
          // WireMock/Seagull may not echo the `query` field back from the
          // static fixture; reattach queries from the POSTed snapshot so the
          // in-session view remains consistent. Harmless no-op against a
          // backend that does persist the field.
          const byId = new Map(snapshot.map((w) => [w.id, w]));
          const mergedWidgets = saved.widgets.map((w) => {
            const source = byId.get(w.id);
            return source?.query ? { ...w, query: source.query } : w;
          });
          qc.setQueryData(["dashboard", id], {
            ...saved,
            widgets: mergedWidgets,
          });
          router.push(viewHref);
        },
      },
    );
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard unsaved changes?")) return;
    router.push(viewHref);
  };

  const handleAddWidget = (adapter: WidgetAdapter) => {
    if (editWidgets === null) return;
    const next: WidgetRef = {
      id: crypto.randomUUID().slice(0, 8),
      kind: adapter.kind,
      title: adapter.defaultTitle,
      x: 20,
      y: 20,
      w: adapter.defaultW,
      h: adapter.defaultH,
    };
    setEditWidgets([...editWidgets, next]);
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
            title={editName ?? data.name}
            isDirty={isDirty}
            isSaving={save.isPending}
            onSave={handleSave}
            onCancel={handleCancel}
            onTitleChange={setEditName}
          />
          <div className="flex gap-4">
            <div className="min-w-0 flex-1">
              <EditableDashboardCanvas
                width={data.width}
                height={data.height}
                widgets={editWidgets}
                onChange={setEditWidgets}
                selectedId={selectedWidgetId}
                onSelect={setSelectedWidgetId}
              />
            </div>
            <div className="flex items-start">
              <Button
                variant="ghost"
                size="sm"
                aria-label={paletteOpen ? "Collapse widget palette" : "Expand widget palette"}
                onClick={() => setPaletteOpen((v) => !v)}
                className="mt-1 h-8 w-6 px-0"
              >
                {paletteOpen ? "›" : "‹"}
              </Button>
              {paletteOpen && (
                selectedWidget ? (
                  <QueryEditor
                    widget={selectedWidget}
                    onApply={handleApplyQuery(selectedWidget.id)}
                    onBack={() => setSelectedWidgetId(null)}
                  />
                ) : (
                  <WidgetPalette onAdd={handleAddWidget} />
                )
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

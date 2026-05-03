"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { AppShell } from "@/components/AppShell";
import { EditableDashboardCanvas } from "@/components/EditableDashboardCanvas";
import { EditToolbar } from "@/components/EditToolbar";
import { WidgetPalette } from "@/components/WidgetPalette";
import { QueryEditor } from "@/components/widgets/QueryEditor";
import { useCreateDashboard } from "@/hooks/useCreateDashboard";
import type { CreateDashboard } from "@/server/schemas/dashboard";
import type { WidgetRef, WidgetQuery } from "@/server/schemas/widget";
import type { WidgetAdapter } from "@/widgets/adapter";

const INITIAL_DRAFT: CreateDashboard = {
  name: "Untitled dashboard",
  width: 1920,
  height: 1080,
  widgets: [],
};

export default function NewDashboardPage() {
  const router = useRouter();
  const create = useCreateDashboard();
  const [draft, setDraft] = useState<CreateDashboard>(INITIAL_DRAFT);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  const selectedWidget =
    selectedWidgetId !== null
      ? draft.widgets.find((w) => w.id === selectedWidgetId) ?? null
      : null;

  const handleApplyQuery =
    (widgetId: string) => (next: WidgetQuery | undefined) => {
      setDraft((d) => ({
        ...d,
        widgets: d.widgets.map((w) =>
          w.id === widgetId
            ? {
                ...w,
                ...(next !== undefined ? { query: next } : { query: undefined }),
              }
            : w,
        ),
      }));
    };

  const isDirty =
    draft.widgets.length > 0 && draft.name.trim().length > 0;

  const handleAddWidget = (adapter: WidgetAdapter) => {
    const next: WidgetRef = {
      id: crypto.randomUUID().slice(0, 8),
      kind: adapter.kind,
      title: adapter.defaultTitle,
      x: 20,
      y: 20,
      w: adapter.defaultW,
      h: adapter.defaultH,
    };
    setDraft((d) => ({ ...d, widgets: [...d.widgets, next] }));
  };

  const handleChangeWidgets = (widgets: WidgetRef[]) =>
    setDraft((d) => ({ ...d, widgets }));

  const handleTitleChange = (name: string) =>
    setDraft((d) => ({ ...d, name }));

  const handleSave = () => {
    create.mutate(draft, {
      onSuccess: (saved) => {
        router.push(`/dashboards/${saved.id}` as Route);
      },
    });
  };

  const handleCancel = () => {
    if (draft.widgets.length === 0 || window.confirm("Discard this dashboard?")) {
      router.push("/");
    }
  };

  return (
    <AppShell>
      {create.error && (
        <p className="mb-3 text-red-400">Create failed: {create.error.message}</p>
      )}
      <EditToolbar
        title={draft.name}
        isDirty={isDirty}
        isSaving={create.isPending}
        onSave={handleSave}
        onCancel={handleCancel}
        onTitleChange={handleTitleChange}
      />
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <EditableDashboardCanvas
            width={draft.width}
            height={draft.height}
            widgets={draft.widgets}
            onChange={handleChangeWidgets}
            selectedId={selectedWidgetId}
            onSelect={setSelectedWidgetId}
          />
        </div>
        {selectedWidget ? (
            <QueryEditor
              widget={selectedWidget}
              onApply={handleApplyQuery(selectedWidget.id)}
              onBack={() => setSelectedWidgetId(null)}
            />
          ) : (
            <WidgetPalette onAdd={handleAddWidget} />
          )}
      </div>
    </AppShell>
  );
}

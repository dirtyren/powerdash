"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { AppShell } from "@/components/AppShell";
import { EditableDashboardCanvas } from "@/components/EditableDashboardCanvas";
import { EditToolbar } from "@/components/EditToolbar";
import { WidgetPalette } from "@/components/WidgetPalette";
import { useCreateDashboard } from "@/hooks/useCreateDashboard";
import type { CreateDashboard } from "@/server/schemas/dashboard";
import type { WidgetRef } from "@/server/schemas/widget";
import {
  WIDGET_CATALOG,
  type WidgetCatalogEntry,
} from "@/config/widget-catalog";

const INITIAL_DRAFT: CreateDashboard = {
  name: "Untitled dashboard",
  owner: "opuser",
  width: 1920,
  height: 1080,
  widgets: [],
};

export default function NewDashboardPage() {
  const router = useRouter();
  const create = useCreateDashboard();
  const [draft, setDraft] = useState<CreateDashboard>(INITIAL_DRAFT);

  const existingWidgetIds = useMemo(
    () => new Set(draft.widgets.map((w) => w.id)),
    [draft.widgets],
  );

  const isDirty =
    draft.widgets.length > 0 && draft.name.trim().length > 0;

  const handleAddWidget = (entry: WidgetCatalogEntry) => {
    const next: WidgetRef = {
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      x: 20,
      y: 20,
      w: entry.defaultW,
      h: entry.defaultH,
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
      router.push("/" as Route);
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
          />
        </div>
        <WidgetPalette
          catalog={WIDGET_CATALOG}
          existingWidgetIds={existingWidgetIds}
          onAdd={handleAddWidget}
        />
      </div>
    </AppShell>
  );
}

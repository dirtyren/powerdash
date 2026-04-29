"use client";

import React from "react";
import type { WidgetCatalogEntry } from "@/config/widget-catalog";

interface Props {
  catalog: WidgetCatalogEntry[];
  existingWidgetIds: Set<string>;
  onAdd: (entry: WidgetCatalogEntry) => void;
}

export function WidgetPalette({ catalog, existingWidgetIds, onAdd }: Props) {
  return (
    <aside className="w-64 border-l border-border bg-card p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Widgets
      </h2>
      <ul className="flex flex-col gap-2">
        {catalog.map((entry) => {
          const disabled = existingWidgetIds.has(entry.id);
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onAdd(entry)}
                disabled={disabled}
                className="flex w-full items-center justify-between rounded border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{entry.title}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {entry.kind}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

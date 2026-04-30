"use client";

import { useMemo } from "react";
import {
  WIDGET_ADAPTERS,
  FAMILY_ORDER,
  familyLabel,
  type WidgetAdapter,
  type WidgetFamily,
} from "@/widgets/adapter";

interface Props {
  onAdd: (adapter: WidgetAdapter) => void;
}

export function WidgetPalette({ onAdd }: Props) {
  const grouped = useMemo<Record<WidgetFamily, WidgetAdapter[]>>(() => {
    const out = Object.fromEntries(
      FAMILY_ORDER.map((f) => [f, [] as WidgetAdapter[]]),
    ) as Record<WidgetFamily, WidgetAdapter[]>;
    for (const a of Object.values(WIDGET_ADAPTERS)) out[a.family].push(a);
    return out;
  }, []);

  return (
    <aside className="w-64 overflow-y-auto border-l border-border bg-card p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Widgets
      </h2>
      {FAMILY_ORDER.map((family) => (
        <section key={family} className="mb-4">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            {familyLabel(family)}
          </h3>
          <ul className="flex flex-col gap-1">
            {grouped[family].map((adapter) => (
              <li key={adapter.kind}>
                <button
                  type="button"
                  onClick={() => onAdd(adapter)}
                  className="flex w-full items-center justify-between rounded border border-border bg-background px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span>{adapter.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}

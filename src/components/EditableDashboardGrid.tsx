"use client";

import { useMemo, useState } from "react";
import GridLayout, { type Layout, WidthProvider } from "react-grid-layout";
import type { WidgetRef } from "@/server/schemas/widget";
import { KpiTile } from "@/components/widgets/KpiTile";
import { LineChart } from "@/components/widgets/LineChart";
import { DataTable } from "@/components/widgets/DataTable";

const ResponsiveGrid = WidthProvider(GridLayout);

function widgetsToLayout(widgets: WidgetRef[]): Layout[] {
  return widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: 1,
    minH: 1,
  }));
}

function applyLayout(widgets: WidgetRef[], layout: Layout[]): WidgetRef[] {
  const byId = new Map(layout.map((l) => [l.i, l]));
  return widgets.map((w) => {
    const l = byId.get(w.id);
    if (!l) return w;
    return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
  });
}

function WidgetBody({ widget }: { widget: WidgetRef }) {
  switch (widget.kind) {
    case "kpi":
      return <KpiTile widgetId={widget.id} title={widget.title} />;
    case "line":
      return <LineChart widgetId={widget.id} title={widget.title} />;
    case "table":
      return <DataTable widgetId={widget.id} title={widget.title} />;
    default: {
      const _exhaustive: never = widget.kind;
      return <div>Unsupported: {_exhaustive}</div>;
    }
  }
}

interface Props {
  widgets: WidgetRef[];
  onChange: (next: WidgetRef[]) => void;
}

export function EditableDashboardGrid({ widgets, onChange }: Props) {
  const layout = useMemo(() => widgetsToLayout(widgets), [widgets]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <ResponsiveGrid
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={80}
      margin={[16, 16]}
      draggableCancel=".widget-remove-button"
      onLayoutChange={(next) => onChange(applyLayout(widgets, next))}
      isDraggable
      isResizable
    >
      {widgets.map((w) => (
        <div
          key={w.id}
          data-widget-id={w.id}
          className="relative"
          onMouseEnter={() => setHoveredId(w.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {hoveredId === w.id && (
            <button
              type="button"
              aria-label={`Remove ${w.title}`}
              className="widget-remove-button absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-sm hover:bg-red-500 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onChange(widgets.filter((x) => x.id !== w.id));
              }}
            >
              ×
            </button>
          )}
          <WidgetBody widget={w} />
        </div>
      ))}
    </ResponsiveGrid>
  );
}

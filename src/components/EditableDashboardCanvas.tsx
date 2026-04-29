"use client";

import { useState } from "react";
import { Rnd } from "react-rnd";
import type { WidgetRef } from "@/server/schemas/widget";
import { KpiTile } from "@/components/widgets/KpiTile";
import { LineChart } from "@/components/widgets/LineChart";
import { DataTable } from "@/components/widgets/DataTable";

function WidgetByKind({ widget }: { widget: WidgetRef }) {
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
  width: number;
  height: number;
  widgets: WidgetRef[];
  onChange: (next: WidgetRef[]) => void;
}

export function EditableDashboardCanvas({ width, height, widgets, onChange }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<WidgetRef>) =>
    onChange(widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const remove = (id: string) =>
    onChange(widgets.filter((w) => w.id !== id));

  return (
    <div className="overflow-auto">
      <div
        className="relative mx-auto border border-border bg-card"
        style={{ width, height }}
      >
        {widgets.map((w) => (
          <Rnd
            key={w.id}
            position={{ x: w.x, y: w.y }}
            size={{ width: w.w, height: w.h }}
            bounds="parent"
            cancel=".widget-remove-button"
            onDragStop={(_, d) =>
              update(w.id, { x: Math.round(d.x), y: Math.round(d.y) })
            }
            onResizeStop={(_, __, ref, ___, pos) =>
              update(w.id, {
                x: Math.round(pos.x),
                y: Math.round(pos.y),
                w: parseInt(ref.style.width, 10),
                h: parseInt(ref.style.height, 10),
              })
            }
          >
            <div
              data-widget-id={w.id}
              className="relative h-full w-full"
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
                    remove(w.id);
                  }}
                >
                  ×
                </button>
              )}
              <WidgetByKind widget={w} />
            </div>
          </Rnd>
        ))}
      </div>
    </div>
  );
}

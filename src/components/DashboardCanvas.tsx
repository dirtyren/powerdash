"use client";

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
}

export function DashboardCanvas({ width, height, widgets }: Props) {
  return (
    <div className="overflow-auto">
      <div
        className="relative mx-auto border border-border bg-card"
        style={{ width, height }}
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            data-widget-id={w.id}
            className="absolute"
            style={{ left: w.x, top: w.y, width: w.w, height: w.h }}
          >
            <WidgetByKind widget={w} />
          </div>
        ))}
      </div>
    </div>
  );
}

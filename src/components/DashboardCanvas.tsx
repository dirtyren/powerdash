"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import { WIDGET_ADAPTERS } from "@/widgets/adapter";
import { EchartsWidget } from "@/components/widgets/EchartsWidget";
import { WidgetFrame } from "@/components/widgets/WidgetFrame";

function WidgetByKind({ widget }: { widget: WidgetRef }) {
  const adapter = WIDGET_ADAPTERS[widget.kind];
  if (adapter.Renderer) return <adapter.Renderer widget={widget} />;
  if (adapter.buildOption) return <EchartsWidget option={adapter.buildOption(widget)} />;
  return <div className="text-red-400">Unsupported: {widget.kind}</div>;
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
            <WidgetFrame title={w.title}>
              <WidgetByKind widget={w} />
            </WidgetFrame>
          </div>
        ))}
      </div>
    </div>
  );
}

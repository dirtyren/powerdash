"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import { WidgetFrame } from "@/components/widgets/WidgetFrame";
import { WidgetByKind } from "@/widgets/render";

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

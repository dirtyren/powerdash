// src/widgets/render.tsx
import type { ComponentType } from "react";
import type { WidgetRef, WidgetKind } from "@/server/schemas/widget";
import { WIDGET_ADAPTERS } from "@/widgets/adapter";
import { EchartsWidget } from "@/components/widgets/EchartsWidget";
import { SeriesChart } from "@/components/widgets/SeriesChart";
import { PromKpi } from "@/components/widgets/promql/PromKpi";
import { PromGauge } from "@/components/widgets/promql/PromGauge";
import { PromTable } from "@/components/widgets/promql/PromTable";
import { PromPie } from "@/components/widgets/promql/PromPie";
import { PromDonut } from "@/components/widgets/promql/PromDonut";

const INSTANT_RENDERERS: Partial<
  Record<WidgetKind, ComponentType<{ widget: WidgetRef }>>
> = {
  kpi: PromKpi,
  gauge: PromGauge,
  table: PromTable,
  pie: PromPie,
  donut: PromDonut,
};

export function WidgetByKind({ widget }: { widget: WidgetRef }) {
  const adapter = WIDGET_ADAPTERS[widget.kind];
  if (widget.query?.expr) {
    if (adapter.seriesType) {
      return <SeriesChart widget={widget} seriesType={adapter.seriesType} />;
    }
    const Instant = INSTANT_RENDERERS[widget.kind];
    if (Instant) return <Instant widget={widget} />;
  }
  if (adapter.Renderer) return <adapter.Renderer widget={widget} />;
  if (adapter.buildOption) {
    return <EchartsWidget option={adapter.buildOption(widget)} />;
  }
  return <div className="text-red-400">Unsupported: {widget.kind}</div>;
}

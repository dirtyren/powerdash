import type { WidgetRef } from "@/server/schemas/widget";
import { WIDGET_ADAPTERS } from "@/widgets/adapter";
import { EchartsWidget } from "@/components/widgets/EchartsWidget";
import { SeriesChart } from "@/components/widgets/SeriesChart";

export function WidgetByKind({ widget }: { widget: WidgetRef }) {
  const adapter = WIDGET_ADAPTERS[widget.kind];
  if (adapter.seriesType && widget.query?.expr) {
    return <SeriesChart widget={widget} seriesType={adapter.seriesType} />;
  }
  if (adapter.Renderer) return <adapter.Renderer widget={widget} />;
  if (adapter.buildOption) {
    return <EchartsWidget option={adapter.buildOption(widget)} />;
  }
  return <div className="text-red-400">Unsupported: {widget.kind}</div>;
}

import type { WidgetRef } from "@/server/schemas/widget";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";
import { SeriesChart } from "@/components/widgets/SeriesChart";

function LineRenderer({ widget }: { widget: WidgetRef }) {
  return <SeriesChart widget={widget} seriesType="line" />;
}

export const lineAdapter: WidgetAdapter = {
  kind: "line",
  family: "series",
  displayName: "Line chart",
  defaultTitle: "Line chart",
  defaultW: 480,
  defaultH: 320,
  seriesType: "line",
  Renderer: LineRenderer,
};

WIDGET_ADAPTERS.line = lineAdapter;

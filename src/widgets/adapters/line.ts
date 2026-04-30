import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";
import { LineChart } from "@/components/widgets/LineChart";
import type { LineData } from "@/server/schemas/widget";

export const LINE_SAMPLE: LineData = {
  kind: "line",
  series: [
    {
      name: "load",
      points: [
        { t: "2026-04-29T00:00:00Z", v: 12 },
        { t: "2026-04-29T01:00:00Z", v: 18 },
        { t: "2026-04-29T02:00:00Z", v: 14 },
        { t: "2026-04-29T03:00:00Z", v: 22 },
        { t: "2026-04-29T04:00:00Z", v: 30 },
        { t: "2026-04-29T05:00:00Z", v: 27 },
      ],
    },
  ],
};

export const lineAdapter: WidgetAdapter = {
  kind: "line",
  family: "series",
  displayName: "Line chart",
  defaultTitle: "Line chart",
  defaultW: 480,
  defaultH: 320,
  Renderer: LineChart,
  sampleData: LINE_SAMPLE,
};

WIDGET_ADAPTERS.line = lineAdapter;

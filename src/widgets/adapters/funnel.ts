import * as echarts from "echarts/core";
import { FunnelChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";

echarts.use([FunnelChart]);

export const funnelAdapter: WidgetAdapter = {
  kind: "funnel",
  family: "part-of-whole",
  displayName: "Funnel chart",
  defaultTitle: "Funnel chart",
  defaultW: 360,
  defaultH: 320,
  buildOption: () => ({
    series: [{
      type: "funnel",
      data: [
        { value: 100, name: "Visited" },
        { value: 80, name: "Signed up" },
        { value: 60, name: "Trialed" },
        { value: 30, name: "Converted" },
        { value: 10, name: "Renewed" },
      ],
    }],
  }),
};

WIDGET_ADAPTERS.funnel = funnelAdapter;

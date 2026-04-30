import * as echarts from "echarts/core";
import { RadarChart } from "echarts/charts";
import { RadarComponent } from "echarts/components";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";

echarts.use([RadarChart, RadarComponent]);

export const radarAdapter: WidgetAdapter = {
  kind: "radar",
  family: "comparison",
  displayName: "Radar chart",
  defaultTitle: "Radar chart",
  defaultW: 420,
  defaultH: 320,
  buildOption: () => ({
    radar: {
      indicator: [
        { name: "CPU", max: 100 },
        { name: "Memory", max: 100 },
        { name: "Disk", max: 100 },
        { name: "Network", max: 100 },
        { name: "Load", max: 100 },
      ],
    },
    series: [{
      type: "radar",
      data: [{ value: [80, 65, 50, 72, 60], name: "Current" }],
    }],
  }),
};

WIDGET_ADAPTERS.radar = radarAdapter;

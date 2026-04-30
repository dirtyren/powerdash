import * as echarts from "echarts/core";
import { GaugeChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";

echarts.use([GaugeChart]);

export const gaugeAdapter: WidgetAdapter = {
  kind: "gauge",
  family: "stats",
  displayName: "Gauge",
  defaultTitle: "Gauge",
  defaultW: 320,
  defaultH: 260,
  buildOption: () => ({
    series: [{
      type: "gauge",
      progress: { show: true },
      detail: { valueAnimation: true, formatter: "{value}" },
      data: [{ value: 62, name: "Usage" }],
    }],
  }),
};

WIDGET_ADAPTERS.gauge = gaugeAdapter;

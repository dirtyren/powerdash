import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";

echarts.use([BarChart]);

export const barAdapter: WidgetAdapter = {
  kind: "bar",
  family: "series",
  displayName: "Bar chart",
  defaultTitle: "Bar chart",
  defaultW: 480,
  defaultH: 320,
  buildOption: () => ({
    xAxis: { type: "category", data: ["A", "B", "C", "D", "E"] },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: [12, 34, 23, 45, 30] }],
  }),
};

WIDGET_ADAPTERS.bar = barAdapter;

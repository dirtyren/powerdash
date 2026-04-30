import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";

echarts.use([BarChart]);

export const stackedBarAdapter: WidgetAdapter = {
  kind: "stacked-bar",
  family: "series",
  displayName: "Stacked bar",
  defaultTitle: "Stacked bar",
  defaultW: 480,
  defaultH: 320,
  buildOption: () => ({
    xAxis: { type: "category", data: ["Q1", "Q2", "Q3", "Q4"] },
    yAxis: { type: "value" },
    series: [
      { name: "A", type: "bar", stack: "total", data: [12, 18, 15, 22] },
      { name: "B", type: "bar", stack: "total", data: [8, 14, 11, 18] },
      { name: "C", type: "bar", stack: "total", data: [5, 7, 9, 12] },
    ],
    legend: { data: ["A", "B", "C"] },
  }),
};

WIDGET_ADAPTERS["stacked-bar"] = stackedBarAdapter;

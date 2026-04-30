import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";

echarts.use([BarChart]);

export const histogramAdapter: WidgetAdapter = {
  kind: "histogram",
  family: "distribution",
  displayName: "Histogram",
  defaultTitle: "Histogram",
  defaultW: 480,
  defaultH: 320,
  buildOption: () => ({
    xAxis: {
      type: "category",
      data: ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90+"],
    },
    yAxis: { type: "value" },
    series: [{
      type: "bar",
      barCategoryGap: "1%",
      data: [2, 5, 12, 19, 28, 22, 15, 8, 4, 1],
    }],
  }),
};

WIDGET_ADAPTERS.histogram = histogramAdapter;

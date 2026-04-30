import * as echarts from "echarts/core";
import { BoxplotChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";

echarts.use([BoxplotChart]);

export const boxPlotAdapter: WidgetAdapter = {
  kind: "box-plot",
  family: "distribution",
  displayName: "Box plot",
  defaultTitle: "Box plot",
  defaultW: 480,
  defaultH: 320,
  // Each boxplot data element is [low, Q1, median, Q3, high]
  buildOption: () => ({
    xAxis: { type: "category", data: ["A", "B", "C", "D"] },
    yAxis: { type: "value" },
    series: [{
      type: "boxplot",
      data: [
        [10, 22, 35, 48, 60],
        [15, 25, 38, 51, 63],
        [12, 28, 40, 55, 70],
        [18, 30, 42, 58, 72],
      ],
    }],
  }),
};

WIDGET_ADAPTERS["box-plot"] = boxPlotAdapter;

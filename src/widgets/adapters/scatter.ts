import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";

echarts.use([ScatterChart]);

export const scatterAdapter: WidgetAdapter = {
  kind: "scatter",
  family: "series",
  displayName: "Scatter plot",
  defaultTitle: "Scatter plot",
  defaultW: 480,
  defaultH: 320,
  buildOption: () => ({
    xAxis: { type: "value" },
    yAxis: { type: "value" },
    series: [{
      type: "scatter",
      symbolSize: 10,
      data: [[10, 20], [18, 28], [25, 31], [34, 45], [42, 50], [50, 62]],
    }],
  }),
};

WIDGET_ADAPTERS.scatter = scatterAdapter;

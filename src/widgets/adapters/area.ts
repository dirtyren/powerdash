import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";

echarts.use([LineChart]);

export const areaAdapter: WidgetAdapter = {
  kind: "area",
  family: "series",
  displayName: "Area chart",
  defaultTitle: "Area chart",
  defaultW: 480,
  defaultH: 320,
  seriesType: "area",
  buildOption: () => ({
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    yAxis: { type: "value" },
    series: [{ type: "line", areaStyle: {}, data: [120, 200, 150, 80, 170] }],
  }),
};

WIDGET_ADAPTERS.area = areaAdapter;

import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";

echarts.use([PieChart]);

export const donutAdapter: WidgetAdapter = {
  kind: "donut",
  family: "part-of-whole",
  displayName: "Donut chart",
  defaultTitle: "Donut chart",
  defaultW: 360,
  defaultH: 320,
  buildOption: () => ({
    series: [{
      type: "pie",
      radius: ["40%", "70%"],
      data: [
        { value: 40, name: "Free" },
        { value: 30, name: "Used" },
        { value: 20, name: "Cached" },
        { value: 10, name: "Buffer" },
      ],
    }],
  }),
};

WIDGET_ADAPTERS.donut = donutAdapter;

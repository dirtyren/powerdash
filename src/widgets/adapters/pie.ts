import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";

echarts.use([PieChart]);

export const pieAdapter: WidgetAdapter = {
  kind: "pie",
  family: "part-of-whole",
  displayName: "Pie chart",
  defaultTitle: "Pie chart",
  defaultW: 360,
  defaultH: 320,
  buildOption: () => ({
    series: [{
      type: "pie",
      radius: "60%",
      data: [
        { value: 335, name: "Search" },
        { value: 310, name: "Direct" },
        { value: 234, name: "Email" },
        { value: 135, name: "Social" },
        { value: 90, name: "Referral" },
      ],
    }],
  }),
};

WIDGET_ADAPTERS.pie = pieAdapter;

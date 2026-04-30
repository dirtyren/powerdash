import * as echarts from "echarts/core";
import { TreemapChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";

echarts.use([TreemapChart]);

export const treemapAdapter: WidgetAdapter = {
  kind: "treemap",
  family: "hierarchy",
  displayName: "Treemap",
  defaultTitle: "Treemap",
  defaultW: 480,
  defaultH: 320,
  buildOption: () => ({
    series: [{
      type: "treemap",
      data: [
        { name: "A", value: 40 },
        { name: "B", value: 25 },
        { name: "C", value: 18 },
        { name: "D", value: 12 },
        { name: "E", value: 5 },
      ],
    }],
  }),
};

WIDGET_ADAPTERS.treemap = treemapAdapter;

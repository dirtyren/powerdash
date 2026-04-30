import * as echarts from "echarts/core";
import { SankeyChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";

echarts.use([SankeyChart]);

export const sankeyAdapter: WidgetAdapter = {
  kind: "sankey",
  family: "density",
  displayName: "Sankey diagram",
  defaultTitle: "Sankey diagram",
  defaultW: 560,
  defaultH: 360,
  buildOption: () => ({
    series: [{
      type: "sankey",
      data: [
        { name: "A" }, { name: "B" }, { name: "C" },
        { name: "X" }, { name: "Y" }, { name: "Z" },
      ],
      links: [
        { source: "A", target: "X", value: 10 },
        { source: "A", target: "Y", value: 5 },
        { source: "B", target: "Y", value: 15 },
        { source: "B", target: "Z", value: 8 },
        { source: "C", target: "X", value: 7 },
        { source: "C", target: "Z", value: 12 },
      ],
    }],
  }),
};

WIDGET_ADAPTERS.sankey = sankeyAdapter;

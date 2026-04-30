import * as echarts from "echarts/core";
import { TreeChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";

echarts.use([TreeChart]);

export const treeAdapter: WidgetAdapter = {
  kind: "tree",
  family: "hierarchy",
  displayName: "Tree",
  defaultTitle: "Tree",
  defaultW: 520,
  defaultH: 360,
  buildOption: () => ({
    series: [{
      type: "tree",
      data: [{
        name: "root",
        children: [
          { name: "a", children: [{ name: "a1" }, { name: "a2" }] },
          { name: "b", children: [{ name: "b1" }, { name: "b2" }, { name: "b3" }] },
        ],
      }],
      symbolSize: 10,
      label: { position: "left", align: "right" },
      expandAndCollapse: false,
    }],
  }),
};

WIDGET_ADAPTERS.tree = treeAdapter;

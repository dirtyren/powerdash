import * as echarts from "echarts/core";
import { SunburstChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";

echarts.use([SunburstChart]);

export const sunburstAdapter: WidgetAdapter = {
  kind: "sunburst",
  family: "hierarchy",
  displayName: "Sunburst",
  defaultTitle: "Sunburst",
  defaultW: 420,
  defaultH: 360,
  buildOption: () => ({
    series: [{
      type: "sunburst",
      data: [
        { name: "A", children: [{ name: "A1", value: 12 }, { name: "A2", value: 18 }] },
        { name: "B", children: [{ name: "B1", value: 15 }, { name: "B2", value: 22 }] },
        { name: "C", children: [{ name: "C1", value: 10 }, { name: "C2", value: 14 }] },
      ],
      radius: [0, "90%"],
    }],
  }),
};

WIDGET_ADAPTERS.sunburst = sunburstAdapter;

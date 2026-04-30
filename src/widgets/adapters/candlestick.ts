import * as echarts from "echarts/core";
import { CandlestickChart } from "echarts/charts";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";

echarts.use([CandlestickChart]);

export const candlestickAdapter: WidgetAdapter = {
  kind: "candlestick",
  family: "financial",
  displayName: "Candlestick",
  defaultTitle: "Candlestick",
  defaultW: 520,
  defaultH: 320,
  // Each candlestick data element is [open, close, low, high]
  buildOption: () => ({
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    yAxis: { type: "value" },
    series: [{
      type: "candlestick",
      data: [
        [100, 110, 95, 115],
        [110, 107, 103, 113],
        [107, 115, 105, 118],
        [115, 112, 108, 119],
        [112, 120, 110, 122],
      ],
    }],
  }),
};

WIDGET_ADAPTERS.candlestick = candlestickAdapter;

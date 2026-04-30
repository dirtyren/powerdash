import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { VisualMapComponent } from "echarts/components";
import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";

echarts.use([HeatmapChart, VisualMapComponent]);

export const heatmapAdapter: WidgetAdapter = {
  kind: "heatmap",
  family: "density",
  displayName: "Heatmap",
  defaultTitle: "Heatmap",
  defaultW: 480,
  defaultH: 320,
  buildOption: () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const hours = ["9", "12", "15", "18", "21"];
    const data: [number, number, number][] = [];
    for (let i = 0; i < days.length; i++) {
      for (let j = 0; j < hours.length; j++) {
        data.push([i, j, Math.round(Math.abs(Math.sin(i + j) * 50))]);
      }
    }
    return {
      xAxis: { type: "category", data: days },
      yAxis: { type: "category", data: hours },
      visualMap: { min: 0, max: 50, calculable: true, orient: "horizontal", left: "center", bottom: 0 },
      series: [{ type: "heatmap", data, label: { show: true } }],
    };
  },
};

WIDGET_ADAPTERS.heatmap = heatmapAdapter;

import type { EChartsCoreOption } from "@/widgets/echarts-core";
import type {
  PromRangeResponse,
  PromMatrixResult,
} from "@/server/schemas/prometheus";
import type { SeriesType } from "@/widgets/adapter";

function labelFor(metric: Record<string, string>): string {
  const { __name__, ...rest } = metric;
  const tail = Object.entries(rest)
    .map(([k, v]) => `${k}="${v}"`)
    .join(", ");
  if (__name__) return tail ? `${__name__}{${tail}}` : __name__;
  return tail || "series";
}

// Prometheus encodes numbers as strings ("+Inf" / "-Inf" / "NaN" or floats).
// parseFloat yields Infinity/NaN for those; coerce non-finite → null and set
// connectNulls:false so echarts renders them as gaps on line/area.
function parseValue(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function baseSeries(s: PromMatrixResult, seriesType: SeriesType) {
  const name = labelFor(s.metric);
  const data = s.values.map(([t, v]) => [t * 1000, parseValue(v)] as const);
  switch (seriesType) {
    case "line":
      return { name, type: "line" as const, smooth: true, showSymbol: false, connectNulls: false, data };
    case "area":
      return { name, type: "line" as const, smooth: true, showSymbol: false, connectNulls: false, areaStyle: {}, data };
    case "bar":
      return { name, type: "bar" as const, data };
    case "stacked-bar":
      return { name, type: "bar" as const, stack: "total" as const, data };
    case "scatter":
      return { name, type: "scatter" as const, symbolSize: 6, data };
  }
}

export function buildSeriesOption(
  resp: PromRangeResponse,
  seriesType: SeriesType,
): EChartsCoreOption {
  const series = resp.data.result.map((s) => baseSeries(s, seriesType));
  return {
    tooltip: { trigger: "axis" },
    legend: {
      data: series.map((s) => s.name),
      textStyle: { color: "#cbd5e1" },
    },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: "#475569" } },
      axisLabel: { color: "#94a3b8" },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#475569" } },
      axisLabel: { color: "#94a3b8" },
      splitLine: { lineStyle: { color: "#1e293b" } },
    },
    series,
  };
}

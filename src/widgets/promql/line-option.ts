import type { EChartsCoreOption } from "@/widgets/echarts-core";
import type { PromRangeResponse } from "@/server/schemas/prometheus";

function labelFor(metric: Record<string, string>): string {
  const { __name__, ...rest } = metric;
  const tail = Object.entries(rest)
    .map(([k, v]) => `${k}="${v}"`)
    .join(", ");
  if (__name__) return tail ? `${__name__}{${tail}}` : __name__;
  return tail || "series";
}

// Prometheus encodes numbers as strings because JSON cannot round-trip
// "+Inf", "-Inf", or "NaN". `parseFloat` produces Infinity / NaN for those
// values; we coerce all non-finite numbers (and unparseable strings) to null,
// and set connectNulls:false so echarts draws them as gaps.
function parseValue(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function buildLineOption(resp: PromRangeResponse): EChartsCoreOption {
  const series = resp.data.result.map((s) => ({
    name: labelFor(s.metric),
    type: "line" as const,
    smooth: true,
    showSymbol: false,
    connectNulls: false,
    data: s.values.map(([t, v]) => [t * 1000, parseValue(v)] as const),
  }));

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

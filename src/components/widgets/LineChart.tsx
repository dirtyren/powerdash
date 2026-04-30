"use client";

import { useMemo } from "react";
import * as echarts from "echarts/core";
import { LineChart as EchartsLineSeries } from "echarts/charts";
import type { WidgetRef } from "@/server/schemas/widget";
import { useWidgetDataOrSample } from "@/hooks/useWidgetDataOrSample";
import { LINE_SAMPLE } from "@/widgets/adapters/line";
import { EchartsWidget } from "@/components/widgets/EchartsWidget";
import type { EChartsCoreOption } from "@/widgets/echarts-core";

echarts.use([EchartsLineSeries]);

export function LineChart({ widget }: { widget: WidgetRef }) {
  const { data, isLoading } = useWidgetDataOrSample(widget.id, LINE_SAMPLE);

  const option: EChartsCoreOption | null = useMemo(() => {
    if (data.kind !== "line") return null;
    return {
      tooltip: { trigger: "axis" },
      legend: { data: data.series.map((s) => s.name), textStyle: { color: "#cbd5e1" } },
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
      series: data.series.map((s) => ({
        name: s.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        data: s.points.map((p) => [p.t, p.v]),
      })),
    };
  }, [data]);

  if (isLoading) return <div className="text-muted-foreground">…</div>;
  if (!option) return null;
  return <EchartsWidget option={option} />;
}

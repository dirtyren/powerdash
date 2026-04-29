"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useWidgetData } from "@/hooks/useWidgetData";

const ReactECharts = dynamic(
  async () => {
    const mod = await import("echarts-for-react");
    return mod.default;
  },
  { ssr: false },
);

export function LineChart({ widgetId, title }: { widgetId: string; title: string }) {
  const { data, isLoading, error } = useWidgetData(widgetId);

  const option: EChartsOption | null = useMemo(() => {
    if (!data || data.kind !== "line") return null;
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {isLoading && <div className="text-muted-foreground">…</div>}
        {error && <div className="text-sm text-red-400">error</div>}
        {option && <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />}
      </CardContent>
    </Card>
  );
}

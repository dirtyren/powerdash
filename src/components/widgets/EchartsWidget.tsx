"use client";

import dynamic from "next/dynamic";
import type { EChartsCoreOption } from "@/widgets/echarts-core";

// Lazy-load both echarts-for-react/core and our echarts instance together.
// This avoids pulling the full echarts library (the default export of
// echarts-for-react imports `echarts` — ~1MB). `echarts-for-react/lib/core`
// accepts a custom echarts instance via its `echarts` prop.
const EchartsChart = dynamic(
  async () => {
    const [{ default: ReactEChartsCore }, { echarts }] = await Promise.all([
      import("echarts-for-react/lib/core"),
      import("@/widgets/echarts-core"),
    ]);
    return function EchartsChart({ option }: { option: EChartsCoreOption }) {
      return (
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ height: "100%", width: "100%" }}
        />
      );
    };
  },
  { ssr: false },
);

export function EchartsWidget({ option }: { option: EChartsCoreOption }) {
  return (
    <div className="h-full w-full">
      <EchartsChart option={option} />
    </div>
  );
}

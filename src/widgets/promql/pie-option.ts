import type { EChartsCoreOption } from "@/widgets/echarts-core";
import type { PromInstantResponse } from "@/server/schemas/prometheus";
import { labelFor, parseValue } from "./instant-helpers";

type Radius = string | [string, string];

export function buildPieOption(
  resp: PromInstantResponse,
  radius: Radius,
): EChartsCoreOption {
  const data = resp.data.result.map((r) => ({
    name: labelFor(r.metric),
    value: parseValue(r.value[1]) ?? 0,
  }));
  return {
    tooltip: { trigger: "item" },
    legend: { textStyle: { color: "#cbd5e1" } },
    series: [{ type: "pie", radius, data }],
  };
}

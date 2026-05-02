"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import { useQueryInstant } from "@/hooks/useQueryInstant";
import { parseValue, labelFor } from "@/widgets/promql/instant-helpers";
import { EchartsWidget } from "@/components/widgets/EchartsWidget";

export function PromGauge({ widget }: { widget: WidgetRef }) {
  const expr = widget.query?.expr ?? "";
  const { data, isLoading, error } = useQueryInstant(expr);

  if (!expr) {
    return (
      <div className="text-muted-foreground text-sm">
        No query — select this widget and add a PromQL expression.
      </div>
    );
  }
  if (isLoading) return <div className="text-muted-foreground">loading…</div>;
  if (error) {
    return (
      <div className="text-red-400 text-sm">Query failed: {error.message}</div>
    );
  }
  const results = data?.data.result ?? [];
  if (results.length === 0) {
    return <div className="text-muted-foreground text-sm">No samples.</div>;
  }
  const first = results[0]!;
  const parsed = parseValue(first.value[1]);
  return (
    <EchartsWidget
      option={{
        series: [{
          type: "gauge",
          progress: { show: true },
          detail: { valueAnimation: true, formatter: "{value}" },
          data: [{ value: parsed ?? 0, name: labelFor(first.metric) }],
        }],
      }}
    />
  );
}

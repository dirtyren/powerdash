"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import { useQueryInstant } from "@/hooks/useQueryInstant";
import { EchartsWidget } from "@/components/widgets/EchartsWidget";
import { buildPieOption } from "@/widgets/promql/pie-option";

type Radius = string | [string, string];

function PieLike({ widget, radius }: { widget: WidgetRef; radius: Radius }) {
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
  if (!data || data.data.result.length === 0) {
    return <div className="text-muted-foreground text-sm">No samples.</div>;
  }
  return <EchartsWidget option={buildPieOption(data, radius)} />;
}

export function PromPie({ widget }: { widget: WidgetRef }) {
  return <PieLike widget={widget} radius="60%" />;
}

export { PieLike };

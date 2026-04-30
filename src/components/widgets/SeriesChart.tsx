"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import type { SeriesType } from "@/widgets/adapter";
import { useQueryRange } from "@/hooks/useQueryRange";
import { EchartsWidget } from "@/components/widgets/EchartsWidget";
import { buildSeriesOption } from "@/widgets/promql/series-option";

interface Props {
  widget: WidgetRef;
  seriesType: SeriesType;
}

export function SeriesChart({ widget, seriesType }: Props) {
  const expr = widget.query?.expr ?? "";
  const step = widget.query?.step;
  const opts = step !== undefined ? { step } : {};
  const { data, isLoading, error } = useQueryRange(expr, opts);

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
  return <EchartsWidget option={buildSeriesOption(data, seriesType)} />;
}

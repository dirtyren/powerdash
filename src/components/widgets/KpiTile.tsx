"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import { useWidgetDataOrSample } from "@/hooks/useWidgetDataOrSample";
import { KPI_SAMPLE } from "@/widgets/adapters/kpi";

export function KpiTile({ widget }: { widget: WidgetRef }) {
  const { data, isLoading } = useWidgetDataOrSample(widget.id, KPI_SAMPLE);

  if (isLoading) return <div className="text-muted-foreground">…</div>;

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-semibold">
        {data.kind === "kpi" ? data.value.toFixed(1) : "—"}
        {data.kind === "kpi" && data.unit && (
          <span className="text-muted-foreground ml-1 text-base">{data.unit}</span>
        )}
      </span>
      {data.kind === "kpi" && typeof data.delta === "number" && (
        <span className={data.delta < 0 ? "text-green-400" : "text-red-400"}>
          {data.delta > 0 ? "+" : ""}
          {data.delta.toFixed(2)}
        </span>
      )}
    </div>
  );
}

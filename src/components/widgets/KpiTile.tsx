"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useWidgetData } from "@/hooks/useWidgetData";

export function KpiTile({ widgetId, title }: { widgetId: string; title: string }) {
  const { data, isLoading, error } = useWidgetData(widgetId);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-muted-foreground">…</div>}
        {error && <div className="text-sm text-red-400">error</div>}
        {data && data.kind === "kpi" && (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">
              {data.value.toFixed(1)}
              {data.unit && (
                <span className="text-muted-foreground ml-1 text-base">{data.unit}</span>
              )}
            </span>
            {typeof data.delta === "number" && (
              <span className={data.delta < 0 ? "text-green-400" : "text-red-400"}>
                {data.delta > 0 ? "+" : ""}
                {data.delta.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

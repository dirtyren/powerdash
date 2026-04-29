"use client";

import { useQuery } from "@tanstack/react-query";
import type { WidgetData } from "@/server/schemas/widget";

async function fetchWidgetData(widgetId: string): Promise<WidgetData> {
  const r = await fetch(`/api/widgets/${encodeURIComponent(widgetId)}/data`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`widget ${widgetId} data failed: ${r.status}`);
  const data: WidgetData = (await r.json()) as WidgetData;
  return data;
}

export function useWidgetData(widgetId: string, refetchMs = 15_000) {
  return useQuery({
    queryKey: ["widget", widgetId],
    queryFn: () => fetchWidgetData(widgetId),
    refetchInterval: refetchMs,
  });
}

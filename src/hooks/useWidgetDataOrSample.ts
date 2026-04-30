"use client";

import { useQuery } from "@tanstack/react-query";
import type { WidgetData } from "@/server/schemas/widget";

async function fetchWidgetData(widgetId: string): Promise<WidgetData> {
  const r = await fetch(`/api/widgets/${encodeURIComponent(widgetId)}/data`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`widget ${widgetId} data failed: ${r.status}`);
  return (await r.json()) as WidgetData;
}

/**
 * Fetches widget data for an existing fixture; if the fetch fails (typically
 * 404 for a UUID id that has no WireMock mapping), returns the provided
 * sample instead. Used by the three legacy components (KpiTile, LineChart,
 * DataTable) so that fresh widgets added from the palette render with sample
 * data without a special code path.
 */
export function useWidgetDataOrSample<T extends WidgetData>(
  widgetId: string,
  sample: T,
): { data: T; isLoading: boolean } {
  const q = useQuery({
    queryKey: ["widget", widgetId],
    queryFn: () => fetchWidgetData(widgetId),
    refetchInterval: 15_000,
    retry: false,
  });
  const data = q.isError || !q.data ? sample : (q.data as T);
  return { data, isLoading: q.isLoading };
}

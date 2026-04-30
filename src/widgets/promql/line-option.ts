import type { PromRangeResponse } from "@/server/schemas/prometheus";
import { buildSeriesOption } from "./series-option";

// Kept for back-compat with the P3.1 /prometheus-demo page.
export function buildLineOption(resp: PromRangeResponse) {
  return buildSeriesOption(resp, "line");
}

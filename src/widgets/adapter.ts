import type { ComponentType } from "react";
import type { WidgetKind, WidgetRef, WidgetData } from "@/server/schemas/widget";
import type { EChartsCoreOption } from "./echarts-core";

export type WidgetFamily =
  | "stats"
  | "series"
  | "comparison"
  | "part-of-whole"
  | "hierarchy"
  | "density"
  | "distribution"
  | "financial"
  | "data";

export const FAMILY_ORDER: readonly WidgetFamily[] = [
  "stats",
  "series",
  "comparison",
  "part-of-whole",
  "hierarchy",
  "density",
  "distribution",
  "financial",
  "data",
];

const FAMILY_LABELS: Record<WidgetFamily, string> = {
  stats: "Stats",
  series: "Series",
  comparison: "Comparison",
  "part-of-whole": "Part of whole",
  hierarchy: "Hierarchies",
  density: "Density",
  distribution: "Distribution",
  financial: "Financial",
  data: "Data",
};

export function familyLabel(f: WidgetFamily): string {
  return FAMILY_LABELS[f];
}

export interface WidgetAdapter {
  kind: WidgetKind;
  family: WidgetFamily;
  displayName: string;
  defaultTitle: string;
  defaultW: number;
  defaultH: number;
  buildOption?: (widget: WidgetRef) => EChartsCoreOption;
  Renderer?: ComponentType<{ widget: WidgetRef }>;
  sampleData?: WidgetData;
}

// The registry is populated by side-effect imports of adapter modules (wired
// in Task 15). Keep this file the single place where the full set is
// assembled so the TypeScript `Record<WidgetKind, WidgetAdapter>` type gives
// us exhaustiveness checking at compile time once all modules are imported.
export const WIDGET_ADAPTERS: Record<WidgetKind, WidgetAdapter> = {} as Record<WidgetKind, WidgetAdapter>;

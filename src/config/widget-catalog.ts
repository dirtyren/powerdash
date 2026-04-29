import type { WidgetKind } from "@/server/schemas/widget";

export type WidgetCatalogEntry = {
  id: string;
  kind: WidgetKind;
  title: string;
  defaultW: number;
  defaultH: number;
};

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  { id: "w-cpu-kpi", kind: "kpi", title: "CPU %", defaultW: 260, defaultH: 160 },
  { id: "w-cpu-line", kind: "line", title: "CPU over time", defaultW: 720, defaultH: 320 },
  { id: "w-hosts-table", kind: "table", title: "Hosts", defaultW: 1000, defaultH: 320 },
];

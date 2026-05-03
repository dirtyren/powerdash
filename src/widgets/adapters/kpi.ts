import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";
import { PromKpi } from "@/components/widgets/promql/PromKpi";

export const kpiAdapter: WidgetAdapter = {
  kind: "kpi",
  family: "stats",
  displayName: "KPI",
  defaultTitle: "KPI",
  defaultW: 260,
  defaultH: 160,
  Renderer: PromKpi,
};

WIDGET_ADAPTERS.kpi = kpiAdapter;

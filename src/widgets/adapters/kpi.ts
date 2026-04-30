import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";
import { KpiTile } from "@/components/widgets/KpiTile";
import type { KpiData } from "@/server/schemas/widget";

export const KPI_SAMPLE: KpiData = { kind: "kpi", value: 42, unit: "%", delta: 3.1 };

export const kpiAdapter: WidgetAdapter = {
  kind: "kpi",
  family: "stats",
  displayName: "KPI",
  defaultTitle: "KPI",
  defaultW: 260,
  defaultH: 160,
  Renderer: KpiTile,
  sampleData: KPI_SAMPLE,
};

WIDGET_ADAPTERS.kpi = kpiAdapter;

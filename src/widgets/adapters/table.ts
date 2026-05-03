import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter-registry";
import { PromTable } from "@/components/widgets/promql/PromTable";

export const tableAdapter: WidgetAdapter = {
  kind: "table",
  family: "data",
  displayName: "Table",
  defaultTitle: "Table",
  defaultW: 480,
  defaultH: 320,
  Renderer: PromTable,
};

WIDGET_ADAPTERS.table = tableAdapter;

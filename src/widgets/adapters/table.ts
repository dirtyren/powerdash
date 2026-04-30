import type { WidgetAdapter } from "../adapter";
import { WIDGET_ADAPTERS } from "../adapter";
import { DataTable } from "@/components/widgets/DataTable";
import type { TableData } from "@/server/schemas/widget";

export const TABLE_SAMPLE: TableData = {
  kind: "table",
  columns: [
    { key: "name", label: "Name" },
    { key: "cpu", label: "CPU %" },
    { key: "mem", label: "Mem %" },
  ],
  rows: [
    { name: "host-1", cpu: 42, mem: 61 },
    { name: "host-2", cpu: 13, mem: 28 },
    { name: "host-3", cpu: 75, mem: 82 },
  ],
};

export const tableAdapter: WidgetAdapter = {
  kind: "table",
  family: "data",
  displayName: "Table",
  defaultTitle: "Table",
  defaultW: 480,
  defaultH: 320,
  Renderer: DataTable,
  sampleData: TABLE_SAMPLE,
};

WIDGET_ADAPTERS.table = tableAdapter;

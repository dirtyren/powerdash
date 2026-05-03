import type { StoredDashboard } from "./types";

export const SEED_DASHBOARDS: readonly StoredDashboard[] = [
  {
    id: "1",
    name: "Infrastructure Overview",
    owner: "opuser",
    width: 1920,
    height: 1080,
    widgets: [
      { id: "w-cpu-kpi",     kind: "kpi",   title: "CPU %",          x:  20, y:  20, w:  260, h: 160 },
      { id: "w-cpu-line",    kind: "line",  title: "CPU over time",  x: 300, y:  20, w:  720, h: 320 },
      { id: "w-hosts-table", kind: "table", title: "Hosts",          x:  20, y: 360, w: 1000, h: 320 },
    ],
  },
];

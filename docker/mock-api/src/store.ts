import { SEED_DASHBOARDS } from "./seed";
import type { StoredDashboard } from "./types";

const dashboards = new Map<string, StoredDashboard>();
let nextId = 2;

export function reset(): void {
  dashboards.clear();
  for (const d of SEED_DASHBOARDS) {
    dashboards.set(d.id, structuredClone(d));
  }
  const maxSeedId = SEED_DASHBOARDS.reduce(
    (max, d) => Math.max(max, Number(d.id) || 0),
    0,
  );
  nextId = maxSeedId + 1;
}

export function list(): StoredDashboard[] {
  return Array.from(dashboards.values());
}

export function get(id: string): StoredDashboard | undefined {
  return dashboards.get(id);
}

export function set(id: string, d: StoredDashboard): void {
  dashboards.set(id, d);
}

export function allocateId(): string {
  return String(nextId++);
}

reset();

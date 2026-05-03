import { eq, asc, sql } from "drizzle-orm";
import { db } from "./client";
import { dashboards } from "./schema";
import type { WidgetRef } from "../schemas/widget";

export type Dashboard = typeof dashboards.$inferSelect;
export type DashboardSummary = Pick<Dashboard, "id" | "name">;
export type CreateDashboardInput = {
  name: string;
  width: number;
  height: number;
  widgets: WidgetRef[];
};
export type UpdateDashboardInput = Partial<CreateDashboardInput>;

export async function listDashboards(): Promise<DashboardSummary[]> {
  return db
    .select({ id: dashboards.id, name: dashboards.name })
    .from(dashboards)
    .orderBy(asc(dashboards.name));
}

export async function getDashboard(id: string): Promise<Dashboard | null> {
  const [row] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.id, id))
    .limit(1);
  return row ?? null;
}

export async function createDashboard(
  input: CreateDashboardInput,
): Promise<Dashboard> {
  const [row] = await db
    .insert(dashboards)
    .values({
      name: input.name,
      width: input.width,
      height: input.height,
      widgets: input.widgets,
    })
    .returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function updateDashboard(
  id: string,
  input: UpdateDashboardInput,
): Promise<Dashboard | null> {
  const [row] = await db
    .update(dashboards)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.widgets !== undefined ? { widgets: input.widgets } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(dashboards.id, id))
    .returning();
  return row ?? null;
}

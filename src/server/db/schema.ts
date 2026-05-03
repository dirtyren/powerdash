import { pgTable, text, integer, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import type { WidgetRef } from "../schemas/widget";

export const dashboards = pgTable("dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  width: integer("width").notNull().default(1920),
  height: integer("height").notNull().default(1080),
  widgets: jsonb("widgets").$type<WidgetRef[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

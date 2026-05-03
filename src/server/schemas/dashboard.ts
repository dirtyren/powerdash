import { z } from "zod";
import { WidgetRefSchema } from "./widget";

export const DashboardSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

export const DashboardSchema = DashboardSummarySchema.extend({
  width: z.coerce.number().int().positive().catch(1920),
  height: z.coerce.number().int().positive().catch(1080),
  widgets: z.array(WidgetRefSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const CreateDashboardSchema = DashboardSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateDashboard = z.infer<typeof CreateDashboardSchema>;

import { z } from "zod";
import { WidgetRefSchema } from "./widget";

export const DashboardSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().min(1),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

export const DashboardSchema = DashboardSummarySchema.extend({
  widgets: z.array(WidgetRefSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

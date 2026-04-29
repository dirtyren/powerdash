import { z } from "zod";
import { callSeagull } from "./client";
import {
  DashboardSummarySchema,
  type Dashboard,
  type DashboardSummary,
} from "../schemas/dashboard";
import { WidgetRefSchema } from "../schemas/widget";

const ListEnvelopeSchema = z.object({
  response: z.object({
    dashboards: z.object({
      dashboard: z.array(DashboardSummarySchema),
    }),
  }),
});

export async function listDashboards(): Promise<DashboardSummary[]> {
  const raw = await callSeagull({
    path: "/dashboards/list.xml",
    arrayPaths: ["response.dashboards.dashboard"],
  });
  const parsed = ListEnvelopeSchema.parse(raw);
  return parsed.response.dashboards.dashboard;
}

const DetailEnvelopeSchema = z.object({
  response: z.object({
    dashboard: DashboardSummarySchema.extend({
      widgets: z.object({ widget: z.array(WidgetRefSchema) }),
    }),
  }),
});

export async function getDashboard(id: string): Promise<Dashboard> {
  const raw = await callSeagull({
    path: `/dashboards/${encodeURIComponent(id)}.xml`,
    arrayPaths: ["response.dashboard.widgets.widget"],
  });
  const parsed = DetailEnvelopeSchema.parse(raw);
  const { widgets, ...rest } = parsed.response.dashboard;
  return { ...rest, widgets: widgets.widget };
}

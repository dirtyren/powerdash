import { z } from "zod";
import { callSeagull, callSeagullJson, SaveDashboardError } from "./client";
import {
  DashboardSummarySchema,
  type Dashboard,
  type DashboardSummary,
} from "../schemas/dashboard";
import { WidgetRefSchema } from "../schemas/widget";
import { buildSaveDashboardBody } from "./save-payload";

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
      width: z.coerce.number().int().positive().catch(1920),
      height: z.coerce.number().int().positive().catch(1080),
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

const SAVE_PATH = "/opmon/seagull/www/index.php/wsconnector/action/savedashboard";

const SaveResponseSchema = z.object({
  output: z.coerce.number().int(),
});

const SAVE_ERROR_MESSAGES: Record<number, string> = {
  [-1]: "Seagull rejected the save (generic error).",
  [-2]: "A dashboard with this name already exists.",
  [-3]: "License limit exceeded; cannot save another dashboard.",
  [-4]: "You do not have permission to save this dashboard.",
};

export async function saveDashboard(dashboard: Dashboard): Promise<Dashboard> {
  // TODO(P2.1→staging): the `widgets` field packed into the save payload is
  // an extension not used by the legacy Flex client (see
  // docs/seagull-save-api.md §Implication). Must be validated against a real
  // OpMon dev instance before promotion: if seagull silently ignores the
  // field, every save will return HTTP 200 with positive `output` but layout
  // changes will not persist — a silent data-loss failure mode.
  const body = buildSaveDashboardBody(dashboard);
  const raw = await callSeagullJson({ path: SAVE_PATH, body });
  const parsed = SaveResponseSchema.parse(raw);

  if (parsed.output <= 0) {
    throw new SaveDashboardError(
      parsed.output,
      SAVE_ERROR_MESSAGES[parsed.output] ?? `Seagull save error (output=${parsed.output})`,
    );
  }

  // Success — re-fetch because the save endpoint does not echo the dashboard.
  return getDashboard(String(parsed.output));
}

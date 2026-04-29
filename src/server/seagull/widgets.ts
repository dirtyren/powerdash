import { z } from "zod";
import { callSeagull, UnsupportedWidgetError } from "./client";
import { WidgetDataSchema, type WidgetData } from "../schemas/widget";

const KpiEnvelopeSchema = z.object({
  response: z.object({
    widget: z.object({
      "@_kind": z.literal("kpi"),
      value: z.coerce.number(),
      unit: z.string().optional(),
      delta: z.coerce.number().optional(),
    }),
  }),
});

const LineEnvelopeSchema = z.object({
  response: z.object({
    widget: z.object({
      "@_kind": z.literal("line"),
      series: z.array(
        z.object({
          name: z.string(),
          point: z.array(z.object({ t: z.string(), v: z.coerce.number() })),
        }),
      ),
    }),
  }),
});

const TableEnvelopeSchema = z.object({
  response: z.object({
    widget: z.object({
      "@_kind": z.literal("table"),
      column: z.array(z.object({ key: z.string(), label: z.string() })),
      row: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
    }),
  }),
});

export async function getWidgetData(widgetId: string): Promise<WidgetData> {
  const raw = await callSeagull({
    path: `/widgets/${encodeURIComponent(widgetId)}/data.xml`,
    arrayPaths: [
      "response.widget.series",
      "response.widget.series.point",
      "response.widget.column",
      "response.widget.row",
    ],
  });

  const kpi = KpiEnvelopeSchema.safeParse(raw);
  if (kpi.success) {
    const w = kpi.data.response.widget;
    return WidgetDataSchema.parse({
      kind: "kpi",
      value: w.value,
      unit: w.unit,
      delta: w.delta,
    });
  }

  const line = LineEnvelopeSchema.safeParse(raw);
  if (line.success) {
    const w = line.data.response.widget;
    return WidgetDataSchema.parse({
      kind: "line",
      series: w.series.map((s) => ({
        name: s.name,
        points: s.point.map((p) => ({ t: p.t, v: p.v })),
      })),
    });
  }

  const table = TableEnvelopeSchema.safeParse(raw);
  if (table.success) {
    const w = table.data.response.widget;
    return WidgetDataSchema.parse({
      kind: "table",
      columns: w.column,
      rows: w.row,
    });
  }

  throw new UnsupportedWidgetError(widgetId);
}

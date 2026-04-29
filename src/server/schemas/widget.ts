import { z } from "zod";

export const WidgetKindSchema = z.enum(["kpi", "line", "table"]);
export type WidgetKind = z.infer<typeof WidgetKindSchema>;

export const WidgetRefSchema = z.object({
  id: z.string().min(1),
  kind: WidgetKindSchema,
  title: z.string().min(1),
  x: z.coerce.number().int().nonnegative(),
  y: z.coerce.number().int().nonnegative(),
  w: z.coerce.number().int().positive(),
  h: z.coerce.number().int().positive(),
});
export type WidgetRef = z.infer<typeof WidgetRefSchema>;

export const KpiDataSchema = z.object({
  kind: z.literal("kpi"),
  value: z.number(),
  unit: z.string().optional(),
  delta: z.number().optional(),
});
export type KpiData = z.infer<typeof KpiDataSchema>;

export const LinePointSchema = z.object({
  t: z.string(), // ISO
  v: z.number(),
});
export const LineDataSchema = z.object({
  kind: z.literal("line"),
  series: z.array(
    z.object({
      name: z.string(),
      points: z.array(LinePointSchema),
    }),
  ),
});
export type LineData = z.infer<typeof LineDataSchema>;

export const TableDataSchema = z.object({
  kind: z.literal("table"),
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
});
export type TableData = z.infer<typeof TableDataSchema>;

export const WidgetDataSchema = z.discriminatedUnion("kind", [
  KpiDataSchema,
  LineDataSchema,
  TableDataSchema,
]);
export type WidgetData = z.infer<typeof WidgetDataSchema>;

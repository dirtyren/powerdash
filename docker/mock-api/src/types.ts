import { z } from "zod";

export type Widget = {
  id: string;
  kind: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  query?: { expr: string; step?: number };
};

export type StoredDashboard = {
  id: string;
  name: string;
  owner: string;
  width: number;
  height: number;
  widgets: Widget[];
};

const WidgetInputSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  title: z.string().min(1),
  x: z.coerce.number(),
  y: z.coerce.number(),
  w: z.coerce.number(),
  h: z.coerce.number(),
  query: z
    .object({
      expr: z.string().min(1),
      step: z.coerce.number().optional(),
    })
    .optional(),
});

// Matches the envelope produced by src/server/seagull/save-payload.ts.
// The legacy client sends `username` (not `owner`) and stringified numbers.
// Unknown legacy fields (description, diagram, metadata, etc.) are stripped.
export const SaveRequestSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    username: z.string().optional(),
    width: z.coerce.number().int().positive().optional(),
    height: z.coerce.number().int().positive().optional(),
    widgets: z.array(WidgetInputSchema).optional(),
  })
  .passthrough();
export type SaveRequest = z.infer<typeof SaveRequestSchema>;

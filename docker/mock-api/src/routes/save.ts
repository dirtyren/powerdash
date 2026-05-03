import type { FastifyInstance } from "fastify";
import * as store from "../store";
import { SaveRequestSchema, type Widget } from "../types";

const SAVE_PATH =
  "/opmon/seagull/www/index.php/wsconnector/action/savedashboard";

export function registerSaveRoutes(app: FastifyInstance): void {
  app.post<{ Body: { json?: string } }>(SAVE_PATH, async (req, reply) => {
    reply.type("application/json");

    const jsonRaw = req.body?.json;
    if (typeof jsonRaw !== "string") return { output: -1 };

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(jsonRaw);
    } catch {
      return { output: -1 };
    }

    const parsed = SaveRequestSchema.safeParse(rawParsed);
    if (!parsed.success) return { output: -1 };
    const input = parsed.data;

    if (input.id && !store.get(input.id)) return { output: -1 };

    const id = input.id ?? store.allocateId();
    const existing = store.get(id);

    const widgets: Widget[] | undefined = input.widgets?.map((w) => {
      const base: Widget = {
        id: w.id,
        kind: w.kind,
        title: w.title,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
      };
      if (w.query) {
        base.query = w.query.step !== undefined
          ? { expr: w.query.expr, step: w.query.step }
          : { expr: w.query.expr };
      }
      return base;
    });

    store.set(id, {
      id,
      name: input.name,
      owner: input.username ?? existing?.owner ?? "opuser",
      width: input.width ?? existing?.width ?? 1920,
      height: input.height ?? existing?.height ?? 1080,
      widgets: widgets ?? existing?.widgets ?? [],
    });

    return { output: Number(id) };
  });
}

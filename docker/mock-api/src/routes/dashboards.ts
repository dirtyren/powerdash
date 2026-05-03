import type { FastifyInstance } from "fastify";
import * as store from "../store";
import { serializeList, serializeDetail } from "../xml";

export function registerDashboardRoutes(app: FastifyInstance): void {
  app.get("/dashboards/list.xml", async (_req, reply) => {
    reply.type("application/xml");
    return serializeList(store.list());
  });

  app.get<{ Params: { id: string } }>(
    "/dashboards/:id.xml",
    async (req, reply) => {
      const { id } = req.params;
      const d = store.get(id);
      if (!d) {
        reply.status(404).type("text/plain");
        return "not found";
      }
      reply.type("application/xml");
      return serializeDetail(d);
    },
  );
}

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { FastifyInstance } from "fastify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILES_DIR = resolve(__dirname, "..", "..", "__files");

const SAFE_ID = /^[A-Za-z0-9_-]+$/;

export function registerWidgetRoutes(app: FastifyInstance): void {
  app.get<{ Params: { id: string } }>(
    "/widgets/:id/data.xml",
    async (req, reply) => {
      const { id } = req.params;
      if (!SAFE_ID.test(id)) {
        reply.status(404).type("text/plain");
        return "not found";
      }
      const path = resolve(FILES_DIR, `widget-${id}-data.xml`);
      try {
        const xml = await readFile(path, "utf8");
        reply.type("application/xml");
        return xml;
      } catch {
        reply.status(404).type("text/plain");
        return "not found";
      }
    },
  );
}

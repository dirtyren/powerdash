import Fastify, { type FastifyInstance } from "fastify";
import formbody from "@fastify/formbody";
import { registerDashboardRoutes } from "./routes/dashboards";
import { registerSaveRoutes } from "./routes/save";
import { registerWidgetRoutes } from "./routes/widgets";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(formbody);
  app.get("/health", () => ({ ok: true }));
  registerDashboardRoutes(app);
  registerSaveRoutes(app);
  registerWidgetRoutes(app);
  return app;
}

async function main() {
  const app = await buildServer();
  await app.listen({ host: "0.0.0.0", port: 8080 });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

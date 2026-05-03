import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { dashboards } from "../src/server/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  const existing = await db.select({ id: dashboards.id }).from(dashboards).limit(1);
  if (existing.length > 0) {
    console.log("seed skipped (table is non-empty)");
    await pool.end();
    return;
  }

  await db.insert(dashboards).values({
    name: "Infrastructure Overview",
    width: 1920,
    height: 1080,
    widgets: [
      { id: "w-cpu-kpi",     kind: "kpi",   title: "CPU %",          x:  20, y:  20, w:  260, h: 160 },
      { id: "w-cpu-line",    kind: "line",  title: "CPU over time",  x: 300, y:  20, w:  720, h: 320 },
      { id: "w-hosts-table", kind: "table", title: "Hosts",          x:  20, y: 360, w: 1000, h: 320 },
    ],
  });
  await pool.end();
  console.log("seeded 1 dashboard");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { Pool } from "pg";

export async function truncateDashboards() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://powerdash:powerdash@localhost:5432/powerdash",
  });
  await pool.query("TRUNCATE TABLE dashboards");
  await pool.end();
}

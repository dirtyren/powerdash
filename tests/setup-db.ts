import { Pool } from "pg";

export async function truncateDashboards() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://opmon:opmon@localhost:5432/opmon",
  });
  await pool.query("TRUNCATE TABLE dashboards");
  await pool.end();
}

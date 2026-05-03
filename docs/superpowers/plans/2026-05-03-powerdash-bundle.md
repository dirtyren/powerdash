# PowerDash pivot bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the PowerDash pivot — drop OpMon/Seagull, persist dashboards in Postgres via Drizzle, rename Davinci→PowerDash, add sidebar list + back-nav, and replace the metric `<select>` with a searchable combobox — all in one coherent sequence.

**Architecture:** Postgres (single `dashboards` table, widgets in JSONB) replaces Seagull+mock-api for persistence. Drizzle ORM + node-postgres as the data layer. Next.js API routes (`/api/dashboards/*`) rewire to the repo module; hooks unchanged. Legacy XML widget-data path deleted entirely. `AppShell` becomes a functional navigation surface. `MetricPicker` is a controlled combobox, no new deps.

**Tech Stack:** Drizzle ORM 0.33+, drizzle-kit, `pg` 8.13+, Postgres 16, Next.js 15, React 19, Zod 3, Vitest 2, Playwright 1. No new runtime deps beyond Drizzle and pg.

**Spec:** `docs/superpowers/specs/2026-05-03-powerdash-bundle-design.md` (commit `097fd0b`).

---

## Ordering rationale

Persistence goes first because the API layer depends on it and later tasks (sidebar, E2E) need working `/api/dashboards/*`. Deletion comes after API rewire so the app is never half-broken. Rename happens after deletion (fewer files in flight). UI work (sidebar, MetricPicker) lands last since it depends on Postgres-backed API + simpler deletion state.

```
T1 Drizzle setup
T2 Migration + seed scripts
T3 Repo + tests
T4 API routes rewired         ← app still boots after this
T5 Delete Seagull + legacy widgets + tests
T6 Delete mock-api + compose cleanup
T7 Davinci→PowerDash + opmon rename
T8 Sidebar + back-nav
T9 MetricPicker component
T10 Wire into QueryBuilder
T11 E2E updates (UUID ids)
T12 Final integration check
```

---

## Task 1: Drizzle setup — deps, schema, client

**Files:**
- Modify: `package.json` (add deps + scripts)
- Create: `drizzle.config.ts`
- Create: `src/server/db/schema.ts`
- Create: `src/server/db/client.ts`

No tests yet — Task 3 tests the repo that uses these.

- [ ] **Step 1: Add deps to `package.json`**

Under `dependencies`:
```
"drizzle-orm": "^0.33.0",
"pg": "^8.13.0"
```

Under `devDependencies`:
```
"drizzle-kit": "^0.24.0",
"@types/pg": "^8.11.0"
```

Under `scripts` (append to the existing block):
```
"db:generate": "drizzle-kit generate",
"db:migrate": "tsx scripts/migrate.ts",
"db:seed": "tsx scripts/seed.ts",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 2: Run install**

```bash
cd /Users/alessandro.ren/dev/dashboard-html
pnpm install
```

Expected: lockfile updates, no errors. If pnpm can't find compatible versions, upgrade the caret range based on what's published.

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://powerdash:powerdash@localhost:5432/powerdash",
  },
} satisfies Config;
```

- [ ] **Step 4: Create `src/server/db/schema.ts`**

```ts
import { pgTable, text, integer, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import type { WidgetRef } from "../schemas/widget";

export const dashboards = pgTable("dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  width: integer("width").notNull().default(1920),
  height: integer("height").notNull().default(1080),
  widgets: jsonb("widgets").$type<WidgetRef[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

- [ ] **Step 5: Create `src/server/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://powerdash:powerdash@localhost:5432/powerdash",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
```

- [ ] **Step 6: Verify tsc is clean**

```bash
pnpm tsc --noEmit
```

Expected: clean (no runtime code is imported yet; these modules just declare types).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml drizzle.config.ts src/server/db/schema.ts src/server/db/client.ts
git commit -m "feat(db): drizzle orm + pg client + dashboards schema"
```

---

## Task 2: Migration + seed scripts + Dockerfile update

**Files:**
- Create: `drizzle/0000_initial.sql` (generated)
- Create: `drizzle/meta/_journal.json` (generated)
- Create: `scripts/migrate.ts`
- Create: `scripts/seed.ts`
- Modify: `docker/Dockerfile` (CMD runs migrate + seed before dev)

- [ ] **Step 1: Ensure Postgres container is up (compose still has mock-api; that's fine for now)**

```bash
cd /Users/alessandro.ren/dev/dashboard-html
docker compose -f docker/docker-compose.yml up -d postgres
sleep 3
docker compose -f docker/docker-compose.yml ps postgres
```

Expected: `powerdash-postgres` or `dashboard-html-postgres` is healthy/running. If the container name is `dashboard-html-postgres`, that's the pre-rename state — fine.

**Important:** the `POSTGRES_USER` / `POSTGRES_DB` are still `opmon` per the current compose. That means the `DATABASE_URL` used below must match. Temporarily use `postgres://opmon:opmon@localhost:5432/opmon` for migration tests until Task 6 renames.

- [ ] **Step 2: Generate the initial migration**

```bash
export DATABASE_URL="postgres://opmon:opmon@localhost:5432/opmon"
pnpm db:generate
```

Expected: Drizzle Kit writes `drizzle/0000_xxx.sql` plus `drizzle/meta/_journal.json`. Inspect the SQL — it should `CREATE TABLE "dashboards"` with the columns from `schema.ts`.

- [ ] **Step 3: Create `scripts/migrate.ts`**

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Create `scripts/seed.ts`**

```ts
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
```

- [ ] **Step 5: Run migrate + seed against the running Postgres**

```bash
export DATABASE_URL="postgres://opmon:opmon@localhost:5432/opmon"
pnpm db:migrate
pnpm db:seed
```

Expected:
- `pnpm db:migrate` prints "migrations applied".
- `pnpm db:seed` prints "seeded 1 dashboard".

Verify:
```bash
docker exec dashboard-html-postgres psql -U opmon -d opmon -c "SELECT id, name FROM dashboards;"
```

Expected: one row with name "Infrastructure Overview" and a UUID.

- [ ] **Step 6: Update `docker/Dockerfile` dev stage CMD**

Find the existing dev-stage `CMD` (likely `CMD ["pnpm", "dev"]` or similar). Replace with:

```dockerfile
CMD ["sh", "-c", "pnpm db:migrate && pnpm db:seed && pnpm dev"]
```

If there's a separate prod stage with its own CMD, also update to `pnpm db:migrate && pnpm db:seed && pnpm start`.

- [ ] **Step 7: Rebuild web container to pick up the new CMD**

```bash
docker compose -f docker/docker-compose.yml up -d --build web
sleep 10
docker logs dashboard-html-web --tail 30
```

Expected: logs show "migrations applied" and "seed skipped (table is non-empty)" (because Step 5 already seeded). Then Next.js dev server starts on port 3000.

- [ ] **Step 8: Commit**

```bash
git add drizzle/ scripts/migrate.ts scripts/seed.ts docker/Dockerfile
git commit -m "feat(db): initial migration + seed + dockerfile CMD"
```

---

## Task 3: Repo (db/dashboards.ts) with Postgres-backed tests

**Files:**
- Create: `src/server/db/dashboards.ts`
- Create: `tests/unit/db-dashboards.test.ts`
- Create: `tests/setup-db.ts` (helper for truncating before each test)

Tests run against the real Postgres container via host-exposed port 5432. `vitest` picks up `DATABASE_URL` from the shell environment.

- [ ] **Step 1: Create the test setup helper**

`tests/setup-db.ts`:

```ts
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
```

- [ ] **Step 2: Write failing tests**

`tests/unit/db-dashboards.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  listDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
} from "@/server/db/dashboards";
import { truncateDashboards } from "../setup-db";

describe("db/dashboards", () => {
  beforeEach(async () => {
    await truncateDashboards();
  });

  it("list() returns empty array when table is empty", async () => {
    expect(await listDashboards()).toEqual([]);
  });

  it("create() inserts and returns the row with generated uuid", async () => {
    const saved = await createDashboard({
      name: "Test A",
      width: 100,
      height: 100,
      widgets: [],
    });
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.name).toBe("Test A");
    expect(saved.widgets).toEqual([]);
  });

  it("list() orders by name ascending", async () => {
    await createDashboard({ name: "B", width: 1, height: 1, widgets: [] });
    await createDashboard({ name: "A", width: 1, height: 1, widgets: [] });
    const list = await listDashboards();
    expect(list.map((d) => d.name)).toEqual(["A", "B"]);
  });

  it("get() returns the full row with widgets", async () => {
    const saved = await createDashboard({
      name: "Full",
      width: 100,
      height: 100,
      widgets: [
        { id: "w1", kind: "kpi", title: "T", x: 0, y: 0, w: 10, h: 10 },
      ],
    });
    const found = await getDashboard(saved.id);
    expect(found).not.toBeNull();
    expect(found?.widgets).toHaveLength(1);
    expect(found?.widgets[0]?.id).toBe("w1");
  });

  it("get() returns null for an unknown id", async () => {
    const nope = await getDashboard("00000000-0000-0000-0000-000000000000");
    expect(nope).toBeNull();
  });

  it("update() merges fields and returns the new row", async () => {
    const saved = await createDashboard({
      name: "Old",
      width: 100,
      height: 100,
      widgets: [],
    });
    const merged = await updateDashboard(saved.id, { name: "New" });
    expect(merged?.name).toBe("New");
    expect(merged?.width).toBe(100);
  });

  it("update() bumps updatedAt", async () => {
    const saved = await createDashboard({
      name: "Old",
      width: 100,
      height: 100,
      widgets: [],
    });
    await new Promise((r) => setTimeout(r, 10));
    const merged = await updateDashboard(saved.id, { name: "New" });
    expect(merged?.updatedAt).toBeInstanceOf(Date);
    expect(merged!.updatedAt.getTime()).toBeGreaterThan(
      saved.updatedAt.getTime(),
    );
  });

  it("update() on unknown id returns null", async () => {
    const nope = await updateDashboard(
      "00000000-0000-0000-0000-000000000000",
      { name: "x" },
    );
    expect(nope).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests — expect failure (module not found)**

```bash
export DATABASE_URL="postgres://opmon:opmon@localhost:5432/opmon"
pnpm vitest run tests/unit/db-dashboards.test.ts
```

Expected: FAIL — "Cannot find module '@/server/db/dashboards'".

- [ ] **Step 4: Implement `src/server/db/dashboards.ts`**

```ts
import { eq, asc } from "drizzle-orm";
import { db } from "./client";
import { dashboards } from "./schema";
import type { WidgetRef } from "../schemas/widget";

export type Dashboard = typeof dashboards.$inferSelect;
export type DashboardSummary = Pick<Dashboard, "id" | "name">;
export type CreateDashboardInput = {
  name: string;
  width: number;
  height: number;
  widgets: WidgetRef[];
};
export type UpdateDashboardInput = Partial<CreateDashboardInput>;

export async function listDashboards(): Promise<DashboardSummary[]> {
  return db
    .select({ id: dashboards.id, name: dashboards.name })
    .from(dashboards)
    .orderBy(asc(dashboards.name));
}

export async function getDashboard(id: string): Promise<Dashboard | null> {
  const [row] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.id, id))
    .limit(1);
  return row ?? null;
}

export async function createDashboard(
  input: CreateDashboardInput,
): Promise<Dashboard> {
  const [row] = await db
    .insert(dashboards)
    .values({
      name: input.name,
      width: input.width,
      height: input.height,
      widgets: input.widgets,
    })
    .returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function updateDashboard(
  id: string,
  input: UpdateDashboardInput,
): Promise<Dashboard | null> {
  const [row] = await db
    .update(dashboards)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.widgets !== undefined ? { widgets: input.widgets } : {}),
      updatedAt: new Date(),
    })
    .where(eq(dashboards.id, id))
    .returning();
  return row ?? null;
}
```

- [ ] **Step 5: Re-run tests — expect pass**

```bash
pnpm vitest run tests/unit/db-dashboards.test.ts
pnpm tsc --noEmit
```

Expected: 8/8 passing. tsc clean.

If a test flakes due to test ordering, the `truncateDashboards()` `beforeEach` should prevent interaction — if flakes persist, set vitest to single-fork:

In `vitest.config.ts`, add:
```ts
test: {
  poolOptions: { forks: { singleFork: true } },
}
```

But first verify the failure is order-dependent.

- [ ] **Step 6: Commit**

```bash
git add src/server/db/dashboards.ts tests/unit/db-dashboards.test.ts tests/setup-db.ts
git commit -m "feat(db): dashboards repo with postgres-backed tests"
```

---

## Task 4: Rewire API routes to use Drizzle repo

**Files:**
- Modify: `src/server/schemas/dashboard.ts` (drop `owner`, add `createdAt`/`updatedAt`, use UUID)
- Modify: `app/api/dashboards/route.ts`
- Modify: `app/api/dashboards/[id]/route.ts`
- Modify: `src/hooks/useCreateDashboard.ts` (drop `owner` from input; confirm shape matches new POST)

Note: after this task the app uses Postgres for dashboards. The Seagull layer still exists but is not called by any API route. That deletion is Task 5.

- [ ] **Step 1: Update `src/server/schemas/dashboard.ts`**

Replace the file contents with:

```ts
import { z } from "zod";
import { WidgetRefSchema } from "./widget";

export const DashboardSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

export const DashboardSchema = DashboardSummarySchema.extend({
  width: z.coerce.number().int().positive().catch(1920),
  height: z.coerce.number().int().positive().catch(1080),
  widgets: z.array(WidgetRefSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const CreateDashboardSchema = DashboardSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateDashboard = z.infer<typeof CreateDashboardSchema>;
```

- [ ] **Step 2: Rewrite `app/api/dashboards/route.ts`**

Replace the file with:

```ts
import { NextResponse } from "next/server";
import {
  listDashboards,
  createDashboard,
} from "@/server/db/dashboards";
import { CreateDashboardSchema } from "@/server/schemas/dashboard";

export async function GET() {
  try {
    const data = await listDashboards();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let parsed;
  try {
    const raw: unknown = await req.json();
    parsed = CreateDashboardSchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_body", message: err instanceof Error ? err.message : String(err) },
      { status: 422 },
    );
  }

  try {
    const saved = await createDashboard(parsed);
    return NextResponse.json(saved, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Rewrite `app/api/dashboards/[id]/route.ts`**

Replace the file with:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getDashboard,
  updateDashboard,
} from "@/server/db/dashboards";
import { WidgetRefSchema } from "@/server/schemas/widget";

const PutBodySchema = z.object({
  widgets: z.array(WidgetRefSchema),
  name: z.string().trim().min(1).optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const d = await getDashboard(id);
    if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(d, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let parsed;
  try {
    const raw: unknown = await req.json();
    parsed = PutBodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_body", message: err instanceof Error ? err.message : String(err) },
      { status: 422 },
    );
  }

  try {
    const saved = await updateDashboard(id, parsed);
    if (!saved) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(saved, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Update `src/hooks/useCreateDashboard.ts`**

Read the current file. The hook calls `POST /api/dashboards` with a `CreateDashboard` input (was `{id, name, owner, width, height, widgets}`). After Task 4 Step 1, the schema drops `owner`. Update the hook's `CreateDashboardInput` type import to match the new shape:

```ts
import type { CreateDashboard, Dashboard } from "@/server/schemas/dashboard";
```

The function body should post `CreateDashboard` (no `owner`). If the hook signature already takes `CreateDashboard`, no edit needed beyond imports. If the `useCreateDashboard` hook internally adds `owner: "opuser"`, remove that line.

- [ ] **Step 5: Update `app/dashboards/new/page.tsx`**

Find the place that builds the `CreateDashboard` object before calling `useCreateDashboard.mutate(...)`. Remove any `owner: "opuser"` field. The object should now be `{ name, width, height, widgets }`.

Also verify: after creation, the page navigates to `/dashboards/{saved.id}`. Since the id is now a UUID string (not `"1"`), this should just work if the existing code uses the returned object's `id` field.

- [ ] **Step 6: Restart web + manual smoke**

```bash
docker compose -f docker/docker-compose.yml restart web
sleep 5
curl -s http://localhost:3000/api/dashboards
```

Expected: JSON array with at least one dashboard `{id: <uuid>, name: "Infrastructure Overview"}`.

```bash
ID=$(curl -s http://localhost:3000/api/dashboards | jq -r '.[0].id')
curl -s "http://localhost:3000/api/dashboards/$ID" | head -c 300
```

Expected: full dashboard JSON with 3 widgets.

Save test:
```bash
curl -s -X PUT "http://localhost:3000/api/dashboards/$ID" \
  -H "Content-Type: application/json" \
  -d '{"widgets":[],"name":"Renamed by PUT"}' | head -c 200
```

Expected: JSON echoing the renamed dashboard.

- [ ] **Step 7: Reset the seed for later tests**

```bash
docker exec dashboard-html-postgres psql -U opmon -d opmon -c "TRUNCATE TABLE dashboards;"
docker compose -f docker/docker-compose.yml restart web
sleep 10
curl -s http://localhost:3000/api/dashboards
```

Expected: the seed ran again on container restart and list has 1 dashboard with name "Infrastructure Overview".

- [ ] **Step 8: Run main vitest + tsc**

```bash
pnpm vitest run
pnpm tsc --noEmit
```

Expected: Most tests pass. A few will fail because Seagull-era tests still reference removed schema fields (`owner`) or expect the Seagull API behavior. Those tests get deleted in Task 5 — don't try to fix them here. Note which tests fail and move on.

- [ ] **Step 9: Commit**

```bash
git add src/server/schemas/dashboard.ts app/api/dashboards/route.ts app/api/dashboards/[id]/route.ts src/hooks/useCreateDashboard.ts app/dashboards/new/page.tsx
git commit -m "feat(api): rewire dashboards routes to drizzle repo"
```

---

## Task 5: Delete Seagull layer + legacy widgets + tests

**Files:**
- Delete: entire `src/server/seagull/` directory
- Delete: `src/hooks/useWidgetData.ts`, `src/hooks/useWidgetDataOrSample.ts`
- Delete: `app/api/widgets/[id]/data/route.ts` (and the parent `app/api/widgets/` dir if empty)
- Delete: `src/components/widgets/KpiTile.tsx`, `LineChart.tsx`, `DataTable.tsx`
- Delete: `tests/unit/KpiTile.test.tsx`, `LineChart.test.tsx`, `DataTable.test.tsx`
- Delete: Seagull-era server tests — exact list in Step 1 below
- Modify: `src/components/WidgetPalette.tsx` (drop legacy widget entries if present)
- Modify: `src/widgets/*.adapter.ts` (remove legacy kind registrations if present)

- [ ] **Step 1: Inventory Seagull-era tests**

```bash
cd /Users/alessandro.ren/dev/dashboard-html
grep -l "seagull\|Seagull" tests/unit/*.{ts,tsx} 2>/dev/null
grep -l "seagull\|Seagull" src/**/*.{ts,tsx} 2>/dev/null
```

Expected output includes:
- `tests/unit/save-payload.test.ts`
- `tests/unit/save-dashboard.test.ts`
- `tests/unit/dashboards.test.ts` (Seagull dashboards.ts — verify by grepping for `callSeagull`)
- `tests/unit/widgets.test.ts` (Seagull widgets.ts — same verification)
- `tests/unit/xml.test.ts`
- `tests/unit/api-dashboards-post.test.ts` (old Seagull POST path — verify by reading it)
- `tests/unit/api-dashboard-put.test.ts` (old Seagull PUT path)
- `tests/unit/api-routes.test.ts` (may mix Seagull + Prometheus routes — verify by reading it; if mixed, split out the Prometheus assertions before deleting)

Tests NOT to delete (Prometheus-related):
- `prom-client.test.ts` (tests `src/widgets/promql/prom-client.ts`)
- `prometheus-client.test.ts` — **verify by reading**: if it imports from `src/server/seagull/client.ts` it's Seagull; if it imports from `src/server/prometheus/` or tests the `fetch`-based Prometheus client, it stays.
- `prometheus-schemas.test.ts` (Prometheus response shapes)
- `api-promql-*.test.ts` (Prometheus passthrough routes)

Before deletion, confirm the list. If any test is ambiguous, read it first.

- [ ] **Step 2: Delete the Seagull server layer**

```bash
rm -rf src/server/seagull/
```

- [ ] **Step 3: Delete Seagull-facing tests (as confirmed in Step 1)**

```bash
rm tests/unit/save-payload.test.ts
rm tests/unit/save-dashboard.test.ts
rm tests/unit/dashboards.test.ts
rm tests/unit/widgets.test.ts
rm tests/unit/xml.test.ts
rm tests/unit/api-dashboards-post.test.ts
rm tests/unit/api-dashboard-put.test.ts
rm tests/unit/api-routes.test.ts
```

If `api-routes.test.ts` had Prometheus assertions mixed in, preserve those before deleting by moving them into `tests/unit/api-promql-*.test.ts` or a new focused file. Don't lose coverage of Prometheus passthrough routes.

- [ ] **Step 4: Delete widget-data route**

```bash
rm app/api/widgets/[id]/data/route.ts
rmdir app/api/widgets/[id]/data 2>/dev/null || true
rmdir app/api/widgets/[id] 2>/dev/null || true
rmdir app/api/widgets 2>/dev/null || true
```

- [ ] **Step 5: Delete legacy widget data hooks**

```bash
rm src/hooks/useWidgetData.ts
rm src/hooks/useWidgetDataOrSample.ts
```

Grep for leftover imports:
```bash
grep -rn "useWidgetData\|useWidgetDataOrSample" src/ app/ tests/ 2>&1 | grep -v "^Binary"
```

Expected: no matches. If any, they need to be updated to use Prom* hooks or the component they're in gets deleted.

- [ ] **Step 6: Delete legacy widget components + their tests**

```bash
rm src/components/widgets/KpiTile.tsx
rm src/components/widgets/LineChart.tsx
rm src/components/widgets/DataTable.tsx
rm tests/unit/KpiTile.test.tsx
rm tests/unit/LineChart.test.tsx
rm tests/unit/DataTable.test.tsx
```

Grep for leftover imports of the component names:
```bash
grep -rn "\(KpiTile\|LineChart\|DataTable\)" src/ app/ tests/ 2>&1 | grep -v "^Binary" | grep -v "PromKpi\|LineChartProm\|PromTable"
```

Expected: no matches. If any remain, either it's a usage that needs replacing with `Prom*` equivalent OR it's a Prom* component that coincidentally matches — check each result.

- [ ] **Step 7: Update the widget palette + adapters**

Read `src/components/WidgetPalette.tsx`. It registers adapter entries for widget kinds. If any entry binds to the deleted components, remove or replace with Prom* equivalents. Example: if `WidgetPalette` has both `"kpi"` and `"prom-kpi"` entries, drop the plain `"kpi"` (which was KpiTile) and keep `"prom-kpi"`, OR consolidate so `"kpi"` now uses PromKpi.

Also read `src/widgets/kpi.adapter.ts`, `src/widgets/line.adapter.ts`, `src/widgets/table.adapter.ts`. If any imports deleted components, swap to `PromKpi` / `LineChartProm` / `PromTable`. The existing tests for those adapters (`adapter.test.ts`, `adapters.echarts.test.ts`) should still pass since they test the adapter shape, not the component internals.

Update `src/components/WidgetPalette.tsx` as needed so the palette list only offers Prometheus-backed widgets.

- [ ] **Step 8: Update `WidgetPalette.test.tsx` if it asserts legacy kinds**

If the test asserts that a specific legacy kind renders in the palette (e.g., "KPI Tile"), swap that assertion for the Prom equivalent ("Prometheus KPI" or whatever the new label is). Goal: test still exercises the palette's shape.

- [ ] **Step 9: Run full suite to catch fallout**

```bash
pnpm vitest run
pnpm tsc --noEmit
```

Fix any cascading breakage. Common issues:
- A component still imports something from `seagull/` — replace the import or delete the component.
- A Zod schema references `owner` — that was handled in Task 4 Step 1. If a leftover reference exists, remove it.
- A test still references `KpiTile` / `LineChart` / `DataTable` — delete that test.

Do NOT `git commit` until tsc + vitest are clean (modulo the known pre-existing test failures from before this task — if those persist, note them but proceed).

Expected: full suite passes except for any test files still referencing removed modules (should be zero after Step 9).

- [ ] **Step 10: Commit**

```bash
git add -u
git status --short
git commit -m "refactor: remove seagull layer + legacy non-prom widgets"
```

Verify the commit includes all the deletions and modifications from Steps 2–8.

---

## Task 6: Delete mock-api + compose cleanup

**Files:**
- Delete: `docker/mock-api/` (entire directory, 10+ files)
- Modify: `docker/docker-compose.yml` (drop `mock-api` service, rename DB creds)
- Modify: `docker/Dockerfile` — remove `SEAGULL_BASE_URL` references if present

- [ ] **Step 1: Stop + remove the mock-api container**

```bash
docker compose -f docker/docker-compose.yml stop mock-api
docker compose -f docker/docker-compose.yml rm -f mock-api
```

- [ ] **Step 2: Delete the mock-api source directory**

```bash
rm -rf docker/mock-api
```

- [ ] **Step 3: Rewrite `docker/docker-compose.yml`**

Open the file, find these blocks and modify:

**Web service:**
- Remove `- SEAGULL_BASE_URL=http://mock-api:8080` from `environment`.
- Update `DATABASE_URL` to `postgres://powerdash:powerdash@postgres:5432/powerdash`.
- Remove `mock-api: condition: service_started` from `depends_on`.
- Keep `postgres: condition: service_healthy` and `prometheus: condition: service_started`.

**Mock-api service:** delete the entire block.

**Postgres service:**
- Change `POSTGRES_USER=opmon` → `POSTGRES_USER=powerdash`
- Change `POSTGRES_PASSWORD=opmon` → `POSTGRES_PASSWORD=powerdash`
- Change `POSTGRES_DB=opmon` → `POSTGRES_DB=powerdash`
- Add a `healthcheck` block if not already present:
```yaml
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U powerdash"]
      interval: 5s
      timeout: 3s
      retries: 5
```

**Container names (optional but consistent):** rename `dashboard-html-mock-api` (gone), `dashboard-html-web` → `powerdash-web`, `dashboard-html-postgres` → `powerdash-postgres`, `dashboard-html-prometheus` → `powerdash-prometheus`.

Final file should look like §13 of the spec.

- [ ] **Step 4: Nuke the postgres volume (old data was under `opmon` user)**

```bash
docker compose -f docker/docker-compose.yml down -v
```

This deletes the `postgres` volume so the new `powerdash` user/db can be created from scratch.

- [ ] **Step 5: Bring up the new stack**

```bash
docker compose -f docker/docker-compose.yml up -d --build
sleep 12
docker compose -f docker/docker-compose.yml ps
docker logs powerdash-web --tail 40
```

Expected:
- Three services running: `powerdash-web`, `powerdash-postgres`, `powerdash-prometheus` (no mock-api).
- Web logs show "migrations applied" and "seeded 1 dashboard".

- [ ] **Step 6: Smoke**

```bash
curl -s http://localhost:3000/api/dashboards
```

Expected: JSON array with one dashboard (Infrastructure Overview, UUID id).

```bash
curl -s http://localhost:8080/health
```

Expected: connection refused (port 8080 no longer bound — mock-api is gone).

- [ ] **Step 7: Update `DATABASE_URL` shells/env**

For later Task 3-style tests on host, export:
```bash
export DATABASE_URL="postgres://powerdash:powerdash@localhost:5432/powerdash"
```

Confirm host-based vitest still works:
```bash
pnpm vitest run tests/unit/db-dashboards.test.ts
```

Expected: 8/8 passing.

- [ ] **Step 8: Commit**

```bash
git add docker/docker-compose.yml
git add -u docker/mock-api  # captures the deletion
git status --short
git commit -m "chore(docker): drop mock-api, rename opmon→powerdash in compose"
```

Verify `git status --short` shows all mock-api deletions + the compose diff.

---

## Task 7: Davinci → PowerDash rename sweep

**Files:**
- Modify: `package.json` (name)
- Modify: `app/layout.tsx` (title, description)
- Modify: `src/components/AppShell.tsx` (sidebar label text — the full rewrite happens in Task 8; for this task, just update the existing string)
- Modify: `README.md` (full rewrite)
- Modify: any remaining code comments mentioning OpMon/Davinci/Seagull/Flex/opmon/opuser

- [ ] **Step 1: Update `package.json`**

Change the `"name"` field at the top:
```json
"name": "powerdash",
```

- [ ] **Step 2: Update `app/layout.tsx`**

Find the `metadata` export and update:
```tsx
export const metadata: Metadata = {
  title: "PowerDash",
  description: "Prometheus dashboards",
};
```

- [ ] **Step 3: Update `src/components/AppShell.tsx` — string only**

In the current pre-Task-8 version, find `"‹ Davinci"` (around line 22) and change to `"PowerDash"`. Task 8 will rewrite the whole file; this interim edit keeps the UI consistent after Task 7.

- [ ] **Step 4: Rewrite `README.md`**

Replace the file with:

```markdown
# PowerDash

A Prometheus-backed dashboard tool. Grafana-like UX, opinionated defaults, built with Next.js 15 + React 19 + TypeScript.

## Quick start

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Open http://localhost:3000. The seed dashboard ("Infrastructure Overview") loads automatically.

## Stack

- Next.js 15 (App Router), React 19, TypeScript 5.6 strict
- TanStack Query v5 for server state
- Zod 3 for validation
- ECharts 5 for charts, tree-shaken per-widget
- CodeMirror 6 + `@prometheus-io/codemirror-promql` for the PromQL editor
- Drizzle ORM + Postgres 16 for persistence
- Vitest 2 + Playwright 1 for tests

## Development

```bash
pnpm install
docker compose -f docker/docker-compose.yml up -d postgres prometheus
export DATABASE_URL="postgres://powerdash:powerdash@localhost:5432/powerdash"
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Run tests:
```bash
pnpm vitest run        # unit
pnpm playwright test   # E2E (needs docker stack up)
```

## Environment

- `DATABASE_URL` — Postgres connection string.
- `PROMETHEUS_BASE_URL` — Prometheus HTTP API base (typically `http://prometheus:9090` in docker, `http://localhost:9090` on host).
```

(Adjust the Quick Start / Development sections if the existing README had project-specific notes worth preserving.)

- [ ] **Step 5: Grep for remaining references**

```bash
grep -rin "davinci\|opmon\|opuser\|seagull\|flex client" src/ app/ tests/ docs/superpowers/plans/ README.md package.json docker/ 2>&1 | grep -v "^Binary" | grep -v "node_modules" | grep -v "\.next" | grep -v "docs/superpowers/specs/" | grep -v "docs/superpowers/plans/2026-05-03-powerdash-bundle.md"
```

Expected: zero matches (or only matches in historical spec/plan docs, which we keep for history).

If any match appears in live code:
- Comment about OpMon → rewrite or delete.
- Literal `"opuser"` in seed data was already updated to have no `owner` field.
- `OpMonDavinci` type name → rename.
- `seagull` in a JSDoc comment → rewrite or delete.

Fix every match before proceeding.

- [ ] **Step 6: Run gates**

```bash
pnpm vitest run
pnpm tsc --noEmit
pnpm lint
```

Expected: all green. The rename is purely cosmetic in code effect — no test should start failing from the rename alone.

- [ ] **Step 7: Commit**

```bash
git add package.json app/layout.tsx src/components/AppShell.tsx README.md
git add -u   # catches any comment sweep edits
git status --short
git commit -m "chore: rename davinci/opmon → powerdash"
```

---

## Task 8: Sidebar dashboard list + back-to-home nav

**Files:**
- Rewrite: `src/components/AppShell.tsx`
- Modify: `src/components/EditToolbar.tsx`
- Modify: `tests/unit/EditToolbar.test.tsx` (add test for "← Dashboards" link)

- [ ] **Step 1: Write failing tests for EditToolbar**

Read `tests/unit/EditToolbar.test.tsx` first, then APPEND this test (inside the existing `describe`):

```tsx
it("renders a back link to home", () => {
  render(
    <EditToolbar
      title="Test"
      isDirty={false}
      isSaving={false}
      onSave={() => {}}
      onCancel={() => {}}
    />,
  );
  const link = screen.getByRole("link", { name: /dashboards/i });
  expect(link).toHaveAttribute("href", "/");
});
```

- [ ] **Step 2: Run the new test — expect failure**

```bash
pnpm vitest run tests/unit/EditToolbar.test.tsx
```

Expected: FAIL — no back link exists.

- [ ] **Step 3: Update `src/components/EditToolbar.tsx`**

Open the file. Near the start of the component's JSX (before the name input block), add a back link. Full updated file:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onTitleChange?: (next: string) => void;
}

export function EditToolbar({
  title,
  isDirty,
  isSaving,
  onSave,
  onCancel,
  onTitleChange,
}: Props) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-baseline gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboards
        </Link>
        {onTitleChange ? (
          <input
            aria-label="Dashboard name"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="border-b border-transparent bg-transparent text-2xl font-semibold outline-none focus:border-border"
          />
        ) : (
          <h1 className="text-2xl font-semibold">{title}</h1>
        )}
        <span className="text-sm text-muted-foreground">
          {isDirty ? "• unsaved changes" : "no changes"}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={!isDirty || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `src/components/AppShell.tsx`**

Replace the file contents:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDashboards } from "@/hooks/useDashboards";
import { useUiStore } from "@/stores/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const pathname = usePathname();
  const { data: dashboards } = useDashboards();

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "border-border bg-card border-r transition-all",
          sidebarOpen ? "w-64" : "w-14",
        )}
      >
        <div className="flex h-12 border-b border-border">
          <button
            onClick={toggle}
            className="h-12 w-12 hover:bg-muted text-sm"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            ≡
          </button>
          {sidebarOpen && (
            <Link
              href="/"
              className="flex-1 px-3 flex items-center hover:bg-muted text-sm font-medium"
            >
              PowerDash
            </Link>
          )}
        </div>
        {sidebarOpen && (
          <nav className="p-2" aria-label="Dashboards">
            <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              Dashboards
            </div>
            {!dashboards ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">Loading…</div>
            ) : dashboards.length === 0 ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">
                No dashboards yet
              </div>
            ) : (
              <ul>
                {dashboards.map((d) => {
                  const href = `/dashboards/${d.id}`;
                  const active =
                    pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
                  return (
                    <li key={d.id}>
                      <Link
                        href={href}
                        className={cn(
                          "block rounded px-2 py-1 text-sm truncate",
                          active
                            ? "bg-muted font-medium"
                            : "hover:bg-muted/50 text-muted-foreground",
                        )}
                      >
                        {d.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        )}
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm vitest run tests/unit/EditToolbar.test.tsx
```

Expected: the new back-link test passes. Existing EditToolbar tests still pass.

```bash
pnpm vitest run
pnpm tsc --noEmit
pnpm lint
```

Expected: all green. Note: AppShell isn't directly unit-tested; it's exercised by E2E.

- [ ] **Step 6: Restart web + manual smoke**

```bash
docker compose -f docker/docker-compose.yml restart web
sleep 6
```

Open `http://localhost:3000/` — sidebar should show:
- Top row: `≡` button + `PowerDash` link.
- Below: "Dashboards" heading + one row "Infrastructure Overview".

Click `Infrastructure Overview` → navigates to `/dashboards/{uuid}`. Sidebar highlights that row.

Click `PowerDash` top label → back to `/`.

Click into Edit on the dashboard → see "← Dashboards" link at the top of the toolbar. Click it → back to `/`.

- [ ] **Step 7: Commit**

```bash
git add src/components/AppShell.tsx src/components/EditToolbar.tsx tests/unit/EditToolbar.test.tsx
git commit -m "feat(nav): sidebar dashboard list + back-to-home link"
```

---

## Task 9: MetricPicker component + tests

**Files:**
- Create: `src/components/widgets/MetricPicker.tsx`
- Create: `tests/unit/MetricPicker.test.tsx`

- [ ] **Step 1: Write failing tests**

`tests/unit/MetricPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MetricPicker } from "@/components/widgets/MetricPicker";

const METRICS = [
  "up",
  "http_requests_total",
  "http_request_duration_seconds",
  "node_cpu_seconds_total",
];

describe("MetricPicker", () => {
  it("renders initial value", () => {
    render(
      <MetricPicker value="up" onChange={() => {}} metrics={METRICS} />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("up");
  });

  it("typing filters the listbox", () => {
    render(
      <MetricPicker value="" onChange={() => {}} metrics={METRICS} />,
    );
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "http" } });
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "http_requests_total",
      "http_request_duration_seconds",
    ]);
  });

  it("clicking an option commits and closes", () => {
    const onChange = vi.fn();
    render(
      <MetricPicker value="" onChange={onChange} metrics={METRICS} />,
    );
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.mouseDown(screen.getByRole("option", { name: "up" }));
    expect(onChange).toHaveBeenCalledWith("up");
    // Dropdown should close — no more options.
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("arrow keys + Enter navigate and commit", () => {
    const onChange = vi.fn();
    render(
      <MetricPicker value="" onChange={onChange} metrics={METRICS} />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("up");
  });

  it("external value prop updates the input", () => {
    const { rerender } = render(
      <MetricPicker value="up" onChange={() => {}} metrics={METRICS} />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("up");
    rerender(
      <MetricPicker value="http_requests_total" onChange={() => {}} metrics={METRICS} />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("http_requests_total");
  });

  it("click outside closes the dropdown", () => {
    render(
      <div>
        <MetricPicker value="" onChange={() => {}} metrics={METRICS} />
        <button>outside</button>
      </div>,
    );
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm vitest run tests/unit/MetricPicker.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/widgets/MetricPicker.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (next: string) => void;
  metrics: string[];
  placeholder?: string;
  disabled?: boolean;
}

const MAX_VISIBLE = 200;

export function MetricPicker({
  value,
  onChange,
  metrics,
  placeholder,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return metrics.slice(0, MAX_VISIBLE);
    return metrics.filter((m) => m.toLowerCase().includes(q)).slice(0, MAX_VISIBLE);
  }, [query, metrics]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const commit = (next: string) => {
    onChange(next);
    setQuery(next);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIdx];
      if (target !== undefined) commit(target);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder ?? "Select a metric…"}
        disabled={disabled}
        className="w-full rounded border border-border bg-background p-2 text-xs"
      />
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded border border-border bg-card shadow"
        >
          {filtered.map((m, i) => (
            <li
              key={m}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(m);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "cursor-pointer px-2 py-1 text-xs",
                i === activeIdx ? "bg-muted" : "hover:bg-muted/50",
              )}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm vitest run tests/unit/MetricPicker.test.tsx
pnpm tsc --noEmit
```

Expected: 6/6 passing. tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/widgets/MetricPicker.tsx tests/unit/MetricPicker.test.tsx
git commit -m "feat(widgets): MetricPicker combobox with keyboard + filter"
```

---

## Task 10: Wire MetricPicker into QueryBuilder

**Files:**
- Modify: `src/components/widgets/QueryBuilder.tsx`
- Modify: `tests/unit/QueryBuilder.test.tsx` (update any assertion that depended on the native `<select>`)

- [ ] **Step 1: Read the current QueryBuilder + its test**

```bash
cat src/components/widgets/QueryBuilder.tsx
cat tests/unit/QueryBuilder.test.tsx
```

Find the Metric section — it currently renders a native `<select value={state.metric} onChange={...}>` with `<option>` children fed from `useMetricNames()`.

- [ ] **Step 2: Replace the `<select>` with `<MetricPicker>`**

In `QueryBuilder.tsx`, add the import:

```tsx
import { MetricPicker } from "@/components/widgets/MetricPicker";
```

Find the metric `<select>` block and replace it with:

```tsx
<MetricPicker
  value={state.metric}
  onChange={(next) => onChange({ ...state, metric: next })}
  metrics={metricNames ?? []}
  placeholder="Select a metric…"
/>
```

`metricNames` should be whatever variable `useMetricNames()` returns — preserve the existing binding.

- [ ] **Step 3: Update `tests/unit/QueryBuilder.test.tsx`**

Any test that does `screen.getByRole("combobox")` should still work (the MetricPicker input has `role="combobox"`). Any test that does `screen.getByRole("option")` or asserts on `<option>` elements needs to account for the fact that options are only rendered when the dropdown is open.

Tests that select a metric might look like:
```tsx
fireEvent.change(select, { target: { value: "up" } });
```

That worked for native select. Under MetricPicker, replace with:
```tsx
fireEvent.focus(combobox);
fireEvent.mouseDown(screen.getByRole("option", { name: "up" }));
```

Read the existing test file and update only the assertions/events that interact with metric selection. Keep the tests' intent identical.

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run tests/unit/QueryBuilder.test.tsx
pnpm vitest run
pnpm tsc --noEmit
pnpm lint
```

Expected: all green.

- [ ] **Step 5: Manual smoke**

```bash
docker compose -f docker/docker-compose.yml restart web
sleep 6
```

Open the app, edit a widget, open Builder mode. Focus the metric input — dropdown shows up to 200 metrics. Type "http" — list filters. Arrow down + Enter — commits. The applied PromQL expression should show the selected metric.

- [ ] **Step 6: Commit**

```bash
git add src/components/widgets/QueryBuilder.tsx tests/unit/QueryBuilder.test.tsx
git commit -m "feat(builder): searchable metric picker"
```

---

## Task 11: Update E2E specs for UUID ids

**Files:**
- Modify: `tests/e2e/dashboard-create.spec.ts`
- Modify: `tests/e2e/dashboard-edit.spec.ts`
- Modify: `tests/e2e/dashboard-widget-types.spec.ts`
- Modify: `tests/e2e/edit-persist.spec.ts` (verify — may already be UUID-compatible)
- Keep: `tests/e2e/dashboard-smoke.spec.ts` (likely unaffected)

The prior E2E update (commit `c15206f`) relaxed URL regexes from `/\/dashboards\/1$/` to `/\/dashboards\/\d+$/`. Under the new UUID scheme that pattern no longer matches. Update to `/\/dashboards\/[0-9a-f-]+$/`.

- [ ] **Step 1: Reset the stack (clean seed)**

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d --build
sleep 12
curl -s http://localhost:3000/api/dashboards
```

Expected: one dashboard, UUID id, name "Infrastructure Overview".

- [ ] **Step 2: Run E2E to see what fails**

```bash
pnpm playwright test --reporter=line
```

Capture the failures. All specs that assert `/\/dashboards\/\d+$/` will fail because the id is now a UUID.

- [ ] **Step 3: Update each failing spec's URL regex**

For each of the 4 specs listed above, grep for `\\/dashboards\\/\\\\d\\+\\$` (or similar) and replace with `/\/dashboards\/[0-9a-f-]+$/`. Be precise — the replacement must be `[0-9a-f-]+` (hex + hyphens for UUID), not a looser pattern.

Example change in `dashboard-create.spec.ts`:

```diff
- await expect(page).toHaveURL(/\/dashboards\/\d+$/, { timeout: 15_000 });
+ await expect(page).toHaveURL(/\/dashboards\/[0-9a-f-]+$/, { timeout: 15_000 });
```

Same change applies in `dashboard-edit.spec.ts` and `dashboard-widget-types.spec.ts`.

- [ ] **Step 4: Re-run E2E**

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d --build
sleep 12
pnpm playwright test
```

Expected: 5/5 PASS. Run twice to confirm determinism.

- [ ] **Step 5: If edit spec's afterEach rename-back used hardcoded id `"1"`, update it**

Read `tests/e2e/dashboard-edit.spec.ts`. If the `test.afterEach` restores dashboard 1 by POSTing to `/api/dashboards/1`, that path no longer exists (id is UUID). Replace with:

```ts
test.afterEach(async ({ page }) => {
  // Fetch the list and restore the first dashboard's name/widgets.
  const list = await page.request.get("/api/dashboards");
  const dashboards = await list.json();
  if (dashboards.length === 0) return;
  const id = dashboards[0].id;
  await page.request.put(`/api/dashboards/${id}`, {
    data: {
      name: "Infrastructure Overview",
      widgets: [
        { id: "w-cpu-kpi",     kind: "kpi",   title: "CPU %",          x:  20, y:  20, w:  260, h: 160 },
        { id: "w-cpu-line",    kind: "line",  title: "CPU over time",  x: 300, y:  20, w:  720, h: 320 },
        { id: "w-hosts-table", kind: "table", title: "Hosts",          x:  20, y: 360, w: 1000, h: 320 },
      ],
    },
  });
});
```

If the `afterEach` doesn't exist or uses a different pattern, adapt accordingly.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/
git commit -m "test(e2e): update specs for uuid dashboard ids"
```

---

## Task 12: Final integration check

No code changes. Verification of the full stack.

- [ ] **Step 1: Fresh stack**

```bash
cd /Users/alessandro.ren/dev/dashboard-html
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d --build
sleep 15
docker compose -f docker/docker-compose.yml ps
```

Expected: 3 services running (web, postgres, prometheus). No mock-api.

- [ ] **Step 2: Unit suite**

```bash
export DATABASE_URL="postgres://powerdash:powerdash@localhost:5432/powerdash"
pnpm vitest run
```

Expected: full suite passes. Roughly 241 tests:
- `adapter.test.ts`, `adapters.echarts.test.ts` — adapter registry
- `api-promql-*.test.ts` — Prometheus proxy routes
- `build-expression.test.ts`, `parse-expression.test.ts` — PromQL
- `db-dashboards.test.ts` — new, 8 tests
- `EchartsWidget.test.tsx`, `EditToolbar.test.tsx`, `WidgetFrame.test.tsx`, `WidgetPalette.test.tsx`
- `instant-helpers.test.ts`, `line-option.test.ts`, `pie-option.test.ts`, `series-option.test.ts`
- `MetricPicker.test.tsx` — new, 6 tests
- `ModeTabs.test.tsx`, `QueryBuilder.test.tsx`, `QueryEditor.test.tsx`
- `prom-client.test.ts`, `prometheus-client.test.ts` (if kept), `prometheus-schemas.test.ts`
- `PromGauge.test.tsx`, `PromKpi.test.tsx`, `PromTable.test.tsx`
- `smoke.test.ts`

- [ ] **Step 3: tsc**

```bash
pnpm tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: lint**

```bash
pnpm lint
```

Expected: clean.

- [ ] **Step 5: E2E**

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d --build
sleep 15
pnpm playwright test
```

Expected: 5/5 PASS.

- [ ] **Step 6: Browser smoke — home**

Open `http://localhost:3000/`:
1. Header says "Dashboards", card shows "Infrastructure Overview".
2. Sidebar: top label "PowerDash" (clickable to /), below it "DASHBOARDS" heading, then one row "Infrastructure Overview".

- [ ] **Step 7: Browser smoke — edit + save + sidebar refresh**

1. Click "Infrastructure Overview" → view page loads.
2. Click Edit → edit page loads.
3. Click "← Dashboards" → back to home (routed via the EditToolbar link).
4. Go back to edit → rename to "Smoke Test" → Save → redirects to view.
5. Look at sidebar: "Smoke Test" now appears in the list (TanStack Query invalidation fired).
6. Reload the browser → "Smoke Test" persists (this is the real Postgres persistence).

- [ ] **Step 8: Browser smoke — builder metric search**

1. On the edit page, select the `line` widget.
2. Click Builder tab.
3. In the Metric input, type `http`. Dropdown filters to metrics containing "http".
4. Arrow-down + Enter selects a metric. PromQL text preview updates.
5. Click Apply → widget updates.
6. Save → reload → widget query persists.

- [ ] **Step 9: Browser smoke — container restart preserves state**

```bash
docker compose -f docker/docker-compose.yml restart web
```

Reload the browser: "Smoke Test" dashboard is still there with the saved widget query. Restart was a web-only restart (Postgres volume intact).

- [ ] **Step 10: Browser smoke — volume wipe re-seeds**

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d --build
sleep 12
```

Reload the browser. Dashboard is back to "Infrastructure Overview" (fresh seed). No "Smoke Test".

- [ ] **Step 11: If all green, no commit needed — PowerDash bundle is done.**

---

## Checklist

- [ ] Task 1: Drizzle setup — deps, schema, client
- [ ] Task 2: Migration + seed scripts + Dockerfile update
- [ ] Task 3: Repo with Postgres-backed tests
- [ ] Task 4: API routes rewired to Drizzle
- [ ] Task 5: Delete Seagull + legacy widgets + tests
- [ ] Task 6: Delete mock-api + compose cleanup
- [ ] Task 7: Davinci → PowerDash rename
- [ ] Task 8: Sidebar dashboard list + back-to-home nav
- [ ] Task 9: MetricPicker component + tests
- [ ] Task 10: Wire MetricPicker into QueryBuilder
- [ ] Task 11: E2E updates for UUID ids
- [ ] Task 12: Final integration check

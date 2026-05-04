# PowerDash

A Prometheus-backed dashboard tool with a canvas-style editor. Drag widgets freely, query any metric with a visual builder or raw PromQL, save to Postgres. Grafana-like in spirit; leaner in scope.

Built with Next.js 15 (App Router), React 19, TypeScript 5.6 strict, Drizzle ORM, and ECharts 5.

---

## Features

### Canvas-based dashboard editor
- **Free positioning.** Widgets have explicit `x/y/w/h` coordinates on a 1920×1080 canvas. No 12-column grid to fight.
- **Drag to move, drag to resize.** Direct-manipulation editing of widget placement.
- **Widget palette.** Add new widgets from a side panel; choose from KPI, line chart, table, gauge, and more.
- **Inline title edit.** Click the dashboard name to rename in place; click Save to persist.
- **Deep linking.** Every dashboard has a stable UUID — `/dashboards/<id>` for view, `/dashboards/<id>/edit` for edit.

### PromQL integration
- **Two query modes per widget.** Switch between raw *Code* (PromQL text) and a guided *Builder* form.
- **Bidirectional parser.** Any expression the Builder can produce round-trips cleanly — switch to Code, tweak, switch back, form repopulates.
- **Searchable metric picker.** Combobox with type-filter (substring match, keyboard navigation) over all metric names from your Prometheus. Replaces the scroll-forever native `<select>`.
- **Label matchers.** Add `label=value` filters with all four operators (`=`, `!=`, `=~`, `!~`).
- **Rate / irate wrapping.** One-click toggle with a custom interval.
- **Aggregations.** `sum`, `avg`, `max`, `min`, `count`, `stddev`, `stdvar` — with optional `by` / `without` grouping.
- **Live autocompletion.** CodeMirror 6 + `@prometheus-io/codemirror-promql` for metric, label, and function completion against the connected Prometheus.
- **Range + instant queries.** Each widget picks the appropriate Prometheus endpoint based on kind.

### Persistence
- **Postgres 16.** One `dashboards` table, widgets stored as JSONB. Managed via Drizzle ORM.
- **Migrations.** Schema changes are generated (`drizzle-kit`) and applied on container startup.
- **Auto-seed.** On an empty database, a sample "Infrastructure Overview" dashboard is inserted automatically.
- **UUID primary keys.** No sequential ids leaking information; safe for sharing URLs.

### Navigation
- **Sidebar dashboard list.** Every dashboard one click away from any page.
- **Back-to-home links.** The `PowerDash` sidebar label and a "← Dashboards" link in the edit toolbar both return to the list.
- **Active-route highlighting.** Current dashboard is emphasized in the sidebar.

### Developer experience
- **Strict TypeScript.** `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` both on. No implicit `any`.
- **Zod validation.** Every API boundary (request body, XML/JSON parse) is validated.
- **Test coverage.** 200+ Vitest unit tests + 5 Playwright E2E specs run against the real stack.
- **Docker Compose dev stack.** Three services (web, Postgres, Prometheus) come up with one command.

---

## Tech stack

| Concern | Tech |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript 5.6 strict |
| Server state | TanStack Query v5 |
| Validation | Zod 3 |
| Charts | ECharts 5 (tree-shaken per widget) |
| PromQL editor | CodeMirror 6 + `@prometheus-io/codemirror-promql` |
| Database | Postgres 16 via Drizzle ORM + `pg` |
| Unit tests | Vitest 2 |
| E2E tests | Playwright 1 |
| Metrics backend | Prometheus 2.54 |

---

## Quick start (Docker)

The easiest path. Three services (web, Postgres, Prometheus) come up with one command.

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

- Web UI: **http://localhost:3000**
- Postgres: `localhost:5432` (`powerdash` / `powerdash` / `powerdash`)
- Prometheus: **http://localhost:9090**

The web container runs `pnpm db:migrate && pnpm db:seed && pnpm dev` on startup, so migrations and the seed dashboard are applied automatically. Persistence survives container restarts; it resets only if you wipe volumes (`docker compose down -v`).

Stop the stack:

```bash
docker compose -f docker/docker-compose.yml down
```

Reset to a fresh seed:

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d --build
```

---

## Local development (without Docker for the web service)

You can run Postgres + Prometheus in Docker and the Next.js dev server on your host (fastest HMR loop).

```bash
# 1. Install deps
pnpm install

# 2. Start Postgres + Prometheus only
docker compose -f docker/docker-compose.yml up -d postgres prometheus

# 3. Point at the host-exposed DB
export DATABASE_URL="postgres://powerdash:powerdash@localhost:5432/powerdash"
export PROMETHEUS_BASE_URL="http://localhost:9090"

# 4. Apply migrations + seed
pnpm db:migrate
pnpm db:seed

# 5. Run the dev server
pnpm dev
```

Open http://localhost:3000.

### Available scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Next.js dev server with HMR |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm vitest run` | Full unit test suite |
| `pnpm playwright test` | End-to-end tests (requires docker stack) |
| `pnpm db:generate` | Generate a new Drizzle migration from schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Insert the sample dashboard (no-op if non-empty) |
| `pnpm db:studio` | Open Drizzle Studio (browse/edit DB in the browser) |

---

## Configuration

All configuration is via environment variables. Sensible defaults are baked into `docker/docker-compose.yml` for the Docker path.

### Required

| Variable | Default (docker) | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://powerdash:powerdash@postgres:5432/powerdash` | Postgres connection string. Must point at a database the app can create tables in. |
| `PROMETHEUS_BASE_URL` | `http://prometheus:9090` | Prometheus HTTP API root. Used for range/instant queries, metric metadata, and label values. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Standard Next.js switch. In `production`, the dev server becomes a production runtime. |
| `PORT` | `3000` | Port the Next.js server listens on. |

### Prometheus data source

Point `PROMETHEUS_BASE_URL` at any Prometheus-compatible endpoint. The bundled dev stack ships with a Prometheus instance scraping itself; replace `docker/prometheus/prometheus.yml` with your own scrape configuration to pull real metrics.

### Postgres schema

A single table:

```sql
CREATE TABLE dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  width integer NOT NULL DEFAULT 1920,
  height integer NOT NULL DEFAULT 1080,
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
```

Widgets are stored as JSON — each element describes `{id, kind, title, x, y, w, h, query?}`. No joins, no widget-level transactions; always load/save the whole dashboard.

---

## Project layout

```
app/
├── page.tsx                        # Home — dashboard list
├── dashboards/
│   ├── new/page.tsx                # Create flow
│   └── [id]/
│       ├── page.tsx                # View
│       └── edit/page.tsx           # Edit
└── api/
    ├── dashboards/route.ts         # GET list + POST create
    ├── dashboards/[id]/route.ts    # GET + PUT
    └── promql/                     # Prometheus proxy endpoints

src/
├── components/
│   ├── AppShell.tsx                # Sidebar + layout
│   ├── EditToolbar.tsx             # Name input + Save / Cancel + back link
│   ├── EditableDashboardCanvas.tsx # Drag/resize canvas
│   ├── WidgetPalette.tsx           # Add-widget panel
│   └── widgets/
│       ├── MetricPicker.tsx        # Searchable metric combobox
│       ├── QueryBuilder.tsx        # Visual PromQL builder
│       ├── QueryEditor.tsx         # Mode tabs + query editor surface
│       ├── PromQLEditor.tsx        # CodeMirror-backed code editor
│       ├── PromKpi.tsx / PromGauge.tsx / PromTable.tsx / SeriesChart.tsx
│       └── ...
├── hooks/                          # React Query hooks
├── server/
│   ├── db/                         # Drizzle schema + client + repo
│   ├── schemas/                    # Zod types shared across the stack
│   └── prometheus/                 # Prometheus HTTP client
└── widgets/
    ├── adapter.ts                  # Widget adapter registry
    ├── adapters/                   # kind → component bindings
    └── promql/                     # Builder state + PromQL parse/build

drizzle/                            # Generated migrations
scripts/                            # migrate.ts, seed.ts
docker/                             # compose, Dockerfile, prometheus.yml
```

---

## Testing

```bash
pnpm vitest run                     # ~211 unit tests
pnpm playwright test                # 5 E2E specs (needs docker stack)
pnpm tsc --noEmit                   # type-check
pnpm lint                           # ESLint
```

Unit tests exercise Zod schemas, the Drizzle repo (against real Postgres via `localhost:5432`), the PromQL parser/builder round-trip, and every widget component. E2E specs drive a full browser session against the real stack.

---

## License

Unlicensed. All rights reserved — or relicense as you wish.

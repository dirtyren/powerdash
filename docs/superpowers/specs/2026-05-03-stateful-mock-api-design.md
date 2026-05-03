# Stateful mock-api (Seagull dashboard CRUD) Design

**Status:** Design 2026-05-03 — ready for implementation plan.
**Depends on:** None (replaces existing WireMock stub; no code in `src/` or `app/` changes).
**Estimate:** ~6–8 engineering hours (~1 day).

The dev docker stack currently uses WireMock as `mock-api`. It returns static XML for `GET /dashboards/list.xml`, `GET /dashboards/1.xml`, and a hard-coded `{"output": 1}` for the Seagull save endpoint. Consequence: edits don't persist across refresh, and new dashboards never appear in the list — the edit loop is effectively blind-flying. This design replaces WireMock entirely with a small Fastify+TypeScript service that actually stores writes in-memory for the lifetime of the container.

---

## 1. Goal

Make the mock stack behave like a real Seagull backend for the three endpoints the app calls: list dashboards, get dashboard by id, and save dashboard. Writes persist in memory until container restart; the seed is loaded fresh on every start. Widget-data XML fixtures remain static file reads.

Success means: save a dashboard, refresh the browser, see the changes. Create a new dashboard, return to the home page, see it in the list.

## 2. Scope

**In scope**
- New service at `docker/mock-api/` — Fastify + TypeScript, run via `tsx` (no build step).
- Four route groups:
  - `GET /dashboards/list.xml` — XML list of summaries from in-memory store.
  - `GET /dashboards/{id}.xml` — XML single dashboard; 404 if not found.
  - `POST /opmon/seagull/www/index.php/wsconnector/action/savedashboard` — form-encoded `json=<JSON>`; creates or updates; returns `{"output": id}` or `{"output": -1}`.
  - `GET /widgets/{id}/data.xml` — static file serve from `__files/` (same files WireMock reads today).
- In-memory store (`Map<string, Dashboard>`), seeded at startup with dashboard 1 ported from the current `get-dashboard-1.xml` fixture.
- Sequential numeric id generation for newly-created dashboards.
- XML serialization via string concatenation with `escapeXML()` — no XML library.
- ~10 unit tests inside the mock service using `fastify.inject()`.
- One new Playwright E2E (`tests/e2e/edit-persist.spec.ts`) that saves and reloads.
- Delete `docker/wiremock/` in the same change.
- Update `docker/docker-compose.yml` to build the new service.

**Out of scope (deferred)**
- File-backed persistence that survives container restart. If needed later, swap the `Map` for a JSON file read/write without touching anything else.
- Simulating non-generic Seagull error codes (`-2` duplicate name, `-3` license limit, `-4` permission denied). Not exercised by the app today.
- Authentication / session cookies. Real Seagull requires them; WireMock ignored them; we ignore them.
- Dashboard 2 ("Network Core"). Was a phantom entry in the old list XML with no detail fixture. Drop it; a second seed dashboard can be added later if useful.
- Concurrency / race handling. Single-process, single-user dev tool.
- Test workspace integration. Mock-service tests run as a separate command.

## 3. Architecture

One new container, `mock-api`, built from `docker/mock-api/`. Exposes port 8080. The web container's `SEAGULL_BASE_URL=http://mock-api:8080` is unchanged, so nothing in `src/server/seagull/` or the app's `/api/` routes needs to change.

```
┌──────────────┐        ┌──────────────────────────┐
│ web (Next)   │────────▶│ mock-api (Fastify+TS)   │
│ SEAGULL_BASE │ :8080  │                          │
└──────────────┘        │ - routes/dashboards.ts   │
                        │ - routes/save.ts         │
                        │ - routes/widgets.ts      │
                        │ - store.ts (Map)         │
                        │ - seed.ts                │
                        │ - xml.ts                 │
                        │ - __files/widget-*.xml   │
                        └──────────────────────────┘
```

No code in `src/`, `app/`, or `tests/unit/` is touched. The only files modified outside the new service are `docker/docker-compose.yml` and the `tests/e2e/` folder for the new E2E spec.

## 4. File layout

```
docker/mock-api/
├── Dockerfile
├── package.json           # fastify, @fastify/formbody, zod, tsx, vitest, typescript
├── tsconfig.json          # strict; target ES2022; module ESNext; moduleResolution Bundler
├── src/
│   ├── server.ts          # Fastify bootstrap + route registration; listens on 0.0.0.0:8080
│   ├── store.ts           # Map, CRUD helpers, reset()
│   ├── seed.ts            # SEED_DASHBOARDS constant
│   ├── xml.ts             # escapeXML, serializeList, serializeDetail
│   ├── types.ts           # StoredDashboard, SaveRequest (Zod)
│   └── routes/
│       ├── dashboards.ts  # GET /dashboards/list.xml + GET /dashboards/:id.xml
│       ├── save.ts        # POST /opmon/.../savedashboard
│       └── widgets.ts     # GET /widgets/:id/data.xml (static)
├── __files/
│   ├── widget-1-data.xml  # moved from docker/wiremock/__files/
│   ├── widget-2-data.xml
│   └── widget-3-data.xml
└── tests/
    └── server.test.ts     # vitest + fastify.inject()
```

## 5. Data model

`docker/mock-api/src/types.ts`:

```ts
import { z } from "zod";

export type Widget = {
  id: string;
  kind: string;
  title: string;
  x: number; y: number; w: number; h: number;
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

// Matches what src/server/seagull/save-payload.ts emits inside `json=...`.
export const SaveRequestSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  owner: z.string().optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  widgets: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      title: z.string(),
      x: z.coerce.number(),
      y: z.coerce.number(),
      w: z.coerce.number(),
      h: z.coerce.number(),
      query: z.object({
        expr: z.string(),
        step: z.coerce.number().optional(),
      }).optional(),
    }),
  ).optional(),
});
export type SaveRequest = z.infer<typeof SaveRequestSchema>;
```

`docker/mock-api/src/store.ts`:

```ts
import { SEED_DASHBOARDS } from "./seed";
import type { StoredDashboard } from "./types";

const dashboards = new Map<string, StoredDashboard>();
let nextId = 2;

export function reset(): void {
  dashboards.clear();
  for (const d of SEED_DASHBOARDS) dashboards.set(d.id, structuredClone(d));
  nextId = Math.max(...SEED_DASHBOARDS.map((d) => Number(d.id) || 0), 1) + 1;
}

export function list(): StoredDashboard[] {
  return Array.from(dashboards.values());
}

export function get(id: string): StoredDashboard | undefined {
  return dashboards.get(id);
}

export function set(id: string, d: StoredDashboard): void {
  dashboards.set(id, d);
}

export function allocateId(): string {
  return String(nextId++);
}

reset();  // seed on module load
```

`docker/mock-api/src/seed.ts`:

```ts
import type { StoredDashboard } from "./types";

export const SEED_DASHBOARDS: StoredDashboard[] = [{
  id: "1",
  name: "Infrastructure Overview",
  owner: "opuser",
  width: 1920,
  height: 1080,
  widgets: [
    { id: "w-cpu-kpi",     kind: "kpi",   title: "CPU %",          x:  20, y:  20, w:  260, h: 160 },
    { id: "w-cpu-line",    kind: "line",  title: "CPU over time",  x: 300, y:  20, w:  720, h: 320 },
    { id: "w-hosts-table", kind: "table", title: "Hosts",          x:  20, y: 360, w: 1000, h: 320 },
  ],
}];
```

## 6. Save endpoint semantics

`POST /opmon/seagull/www/index.php/wsconnector/action/savedashboard`, Content-Type `application/x-www-form-urlencoded`, body `json=<URL-encoded JSON>`. `@fastify/formbody` parses the form into `{ json: "..." }`.

Handler in `docker/mock-api/src/routes/save.ts`:

```ts
export async function handleSave(req: FastifyRequest, reply: FastifyReply) {
  const jsonRaw = (req.body as { json?: string }).json;
  if (!jsonRaw) return reply.status(200).send({ output: -1 });

  let parsedUnknown: unknown;
  try { parsedUnknown = JSON.parse(jsonRaw); }
  catch { return reply.status(200).send({ output: -1 }); }

  const parsed = SaveRequestSchema.safeParse(parsedUnknown);
  if (!parsed.success) return reply.status(200).send({ output: -1 });

  const input = parsed.data;

  // Unknown id → reject.
  if (input.id && !store.get(input.id)) {
    return reply.status(200).send({ output: -1 });
  }

  const id = input.id ?? store.allocateId();
  const existing = store.get(id);

  store.set(id, {
    id,
    name: input.name,
    owner: input.owner ?? existing?.owner ?? "opuser",
    width: input.width ?? existing?.width ?? 1920,
    height: input.height ?? existing?.height ?? 1080,
    widgets: input.widgets ?? existing?.widgets ?? [],
  });

  return reply.status(200).send({ output: Number(id) });
}
```

**Response contract**
- Always `200 OK` with `Content-Type: application/json`. Matches real Seagull.
- Success: `{"output": <positive integer id>}`. The app's `saveDashboard()` in `src/server/seagull/dashboards.ts:84` then refetches via `getDashboard(String(output))` — that GET now returns the just-saved state.
- Failure: `{"output": -1}`. The app maps that to a `SaveDashboardError` with generic "Seagull rejected the save" message.

## 7. XML serialization

`docker/mock-api/src/xml.ts` — ~60 lines, zero deps.

```ts
export function escapeXML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function serializeList(dashboards: StoredDashboard[]): string {
  const items = dashboards.map((d) => `
    <dashboard>
      <id>${escapeXML(d.id)}</id>
      <name>${escapeXML(d.name)}</name>
      <owner>${escapeXML(d.owner)}</owner>
    </dashboard>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <dashboards>${items}
  </dashboards>
</response>`;
}

export function serializeDetail(d: StoredDashboard): string {
  const widgets = d.widgets.map(serializeWidget).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <dashboard>
    <id>${escapeXML(d.id)}</id>
    <name>${escapeXML(d.name)}</name>
    <owner>${escapeXML(d.owner)}</owner>
    <width>${d.width}</width>
    <height>${d.height}</height>
    <widgets>${widgets}
    </widgets>
  </dashboard>
</response>`;
}

function serializeWidget(w: Widget): string {
  const query = w.query
    ? `
        <query>
          <expr>${escapeXML(w.query.expr)}</expr>${
            w.query.step !== undefined ? `
          <step>${w.query.step}</step>` : ""
          }
        </query>`
    : "";
  return `
      <widget>
        <id>${escapeXML(w.id)}</id>
        <kind>${escapeXML(w.kind)}</kind>
        <title>${escapeXML(w.title)}</title>
        <x>${w.x}</x>
        <y>${w.y}</y>
        <w>${w.w}</w>
        <h>${w.h}</h>${query}
      </widget>`;
}
```

The emitted shape matches what the app's Zod parsers in `src/server/seagull/dashboards.ts:12-37` expect: `response.dashboards.dashboard` (array) for the list; `response.dashboard` with `widgets.widget` (array) for the detail.

Element ordering inside `<widget>`: identity (`id`, `kind`, `title`), then geometry (`x`, `y`, `w`, `h`), then optional `query`. Matches the Zod field order and is stable.

`<query>` and `<step>` are omitted entirely when absent — the server-side Zod schemas treat those as optional.

## 8. Routes

`docker/mock-api/src/routes/dashboards.ts`:

```ts
app.get("/dashboards/list.xml", (_req, reply) => {
  reply.type("application/xml").send(serializeList(store.list()));
});

app.get("/dashboards/:id.xml", (req, reply) => {
  const { id } = req.params as { id: string };
  const d = store.get(id);
  if (!d) return reply.status(404).type("text/plain").send("not found");
  reply.type("application/xml").send(serializeDetail(d));
});
```

`docker/mock-api/src/routes/widgets.ts` — static file serve with direct id-to-filename mapping:

```ts
app.get("/widgets/:id/data.xml", async (req, reply) => {
  const { id } = req.params as { id: string };
  const path = resolve(__dirname, "..", "..", "__files", `widget-${id}-data.xml`);
  try {
    const xml = await readFile(path, "utf8");
    reply.type("application/xml").send(xml);
  } catch {
    reply.status(404).type("text/plain").send("not found");
  }
});
```

The current WireMock setup uses an id→index indirection (URL `/widgets/w-cpu-kpi/data.xml` → file `widget-1-data.xml`). We remove that indirection: files are **renamed** to match widget ids directly as part of the move:

| Old filename | New filename |
|---|---|
| `widget-1-data.xml` | `widget-w-cpu-kpi-data.xml` |
| `widget-2-data.xml` | `widget-w-cpu-line-data.xml` |
| `widget-3-data.xml` | `widget-w-hosts-table-data.xml` |

Why: the old indirection existed because WireMock mappings needed one JSON-per-request, and the widget-id strings were inconvenient. Fastify lets us take widget id straight from the URL param — no lookup table needed.

`docker/mock-api/src/server.ts` — bootstrap:

```ts
import Fastify from "fastify";
import formbody from "@fastify/formbody";
import { registerDashboardRoutes } from "./routes/dashboards";
import { registerSaveRoutes } from "./routes/save";
import { registerWidgetRoutes } from "./routes/widgets";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(formbody);
  registerDashboardRoutes(app);
  registerSaveRoutes(app);
  registerWidgetRoutes(app);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildServer().listen({ host: "0.0.0.0", port: 8080 });
}
```

`buildServer()` is exported so tests can `fastify.inject()` against it without binding a real port.

## 9. Dockerization & compose

`docker/mock-api/Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
EXPOSE 8080
CMD ["pnpm", "start"]
```

`docker/mock-api/package.json`:

```json
{
  "name": "mock-api",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/server.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/formbody": "^7.4.0",
    "zod": "^3.23.0",
    "tsx": "^4.19.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

`docker/docker-compose.yml` — replace the `mock-api` service block:

```yaml
mock-api:
  build:
    context: ./mock-api
    dockerfile: Dockerfile
  container_name: dashboard-html-mock-api
  ports:
    - "8080:8080"
  restart: unless-stopped
```

Remove the `volumes:` entries entirely (widget XMLs are baked into the image). `web.depends_on.mock-api.condition: service_started` stays.

`docker/wiremock/` is deleted in the same commit. Widget XML files move to `docker/mock-api/__files/`.

## 10. Tests

**Unit tests** (`docker/mock-api/tests/server.test.ts`, ~10 cases, `fastify.inject()`):

```ts
describe("mock-api", () => {
  beforeEach(() => reset());

  it("GET /dashboards/list.xml returns the seed dashboard", async () => { ... });
  it("GET /dashboards/1.xml returns the seed with widgets", async () => { ... });
  it("GET /dashboards/999.xml returns 404", async () => { ... });

  it("POST savedashboard with existing id updates the dashboard", async () => { ... });
  it("POST savedashboard without id creates a new dashboard", async () => { ... });
  it("POST savedashboard with unknown id returns {output: -1}", async () => { ... });
  it("POST savedashboard with malformed json returns {output: -1}", async () => { ... });

  it("round-trip: save-then-get returns widgets (including query)", async () => { ... });
  it("list reflects newly created dashboards after save", async () => { ... });

  it("GET /widgets/w-cpu-kpi/data.xml serves the static fixture", async () => { ... });
});
```

The round-trip test is the load-bearing one — it's what would have caught the bug that motivated this spec.

**New E2E** (`tests/e2e/edit-persist.spec.ts`, 1 case):

```ts
test("widget edits persist across refresh", async ({ page }) => {
  await page.goto("/dashboards/1/edit");
  const name = page.getByRole("textbox", { name: "Dashboard name" });
  await name.fill("Edited Name");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL("/dashboards/1");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Edited Name" })).toBeVisible();
});
```

Baseline after the change:
- Main repo: 239 unit + 5 E2E (one added).
- Mock service: 10 unit tests run via `cd docker/mock-api && pnpm test`.

## 11. Migration & compatibility

- **No changes in `src/` or `app/`.** The Seagull client, the Next.js API routes, and Zod schemas are untouched. Env var `SEAGULL_BASE_URL` unchanged.
- **The edit page's "merge queries from snapshot" workaround** (`app/dashboards/[id]/edit/page.tsx:92-101`) becomes redundant once the mock echoes widgets back. Leave it in place — it's a cheap safety net if the mock is ever wrong, and removing it is out of scope here.
- **Existing E2E** (4 specs) exercise the stack and should pass unchanged. They don't assume stateless behavior; the only risk is if any test re-fetches and expects the old static XML content.

## 12. Risks

1. **Lockfile handling in Docker build.** `pnpm install --frozen-lockfile` requires a committed `pnpm-lock.yaml`. The plan must include running `pnpm install` inside `docker/mock-api/` to generate the lockfile before the first `docker compose build`.
2. **Port collision.** Port 8080 stays; no change in risk vs. WireMock.
3. **XML ampersand in PromQL expressions.** Real workloads have `&` via URL-encoded PromQL (unlikely in our case). `escapeXML` handles it. Tests should include a widget with `query.expr` containing `<`, `&`, `"` to confirm.
4. **Widget-data filename rename.** Files are renamed from numeric-index to widget-id as part of the move (see Section 8). If any existing E2E asserts on file paths rather than URLs, it would break — none do, but the plan should include a grep over `tests/e2e/` to confirm.
5. **E2E timing.** After the first save, the Playwright test reads from the stateful mock. If the reload happens before the PUT response returns, the test may flake. Use `await page.waitForURL("/dashboards/1")` (response-tied) rather than a static timeout.
6. **`structuredClone` in the seed.** `reset()` uses `structuredClone(d)` so mutations to stored dashboards don't bleed into the seed constant. Requires Node 17+ (Node 20 in the Dockerfile — safe).
7. **Fastify version churn.** Fastify 5 is current but has breaking changes vs. 4. Pin to `^4.28.0` to avoid surprises; upgrade deliberately later.

## 13. Open questions (deferred)

- **Surviving container restarts.** If the in-memory story becomes a pain, swap the `Map` for a JSON file in a volume. Out of scope.
- **Multi-dashboard seed.** Adding a second seed dashboard for "Network Core" is ~20 lines; deferred until someone wants it.
- **Simulating Seagull error codes other than `-1`.** Deferred — not used in practice.
- **Workspace-integrated tests.** Running mock-service tests as part of the main `pnpm vitest run` needs pnpm workspaces or nx. Deferred.

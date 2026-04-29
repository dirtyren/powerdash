# OpMon Davinci Dashboard — Flex → Next.js Migration Design

**Date:** 2026-04-29
**Status:** Draft (pending user review)
**Scope:** Main dashboard (`flex/src/main.mxml`) only. Viewer, opmap, scatmap, cmdbmap, and mobile remain on Flash for this phase.
**Target workspace:** `/Users/alessandro.ren/dev/dashboard-html/` (standalone, new git repo)

---

## 1. Executive summary

The OpMon Davinci dashboard is an ActionScript 3.5 / Flex application compiled to `.swf` and shipped inside the OpMon RPM (`opmon-dashboard`). It renders monitoring dashboards by consuming PHP/seagull web services that return XML/SOAP.

This document proposes migrating the main dashboard surface to **Next.js 15 (App Router) + TypeScript + React 19**, with the PHP/seagull backend **left untouched**. Server-side Route Handlers act as an XML → JSON proxy so client components consume typed JSON only.

Estimated effort: **~920 engineering hours** (~22 calendar weeks with 2 FE + 0.5 BE + 0.25 design). A Docker Compose stack is provided for local development and stakeholder evaluation only — production continues to ship via the existing RPM path in this phase.

---

## 2. Technical feasibility analysis

### 2.1 Translating Flex components to React

| Flex construct                                        | React replacement                                          | Notes                                        |
| ----------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| `mx:VBox` / `mx:HBox` / `mx:Panel`                    | Tailwind flex/grid + shadcn `Card`                         | 1:1 container mapping                        |
| `mx:DataGrid` / `AdvancedDataGrid`                    | **TanStack Table**                                         | Virtualization via `@tanstack/react-virtual` |
| `mx:LineChart` / `ColumnChart` / `PieChart`           | **ECharts** (heavy) + **Tremor** (KPI tiles)               | See §2.3                                     |
| Gauges, odometers                                     | ECharts gauge series                                       |                                              |
| `mx:Tree`, `mx:Accordion`                             | shadcn `Accordion` + custom tree                           |                                              |
| `[Bindable]` + `BindingUtils`                         | **TanStack Query** (server state) + **Zustand** (UI state) |                                              |
| Flex modules (`viewerModule`, `scatmapModule`)        | Out of scope                                               | Remain on Flash                              |
| Drag/drop dashboard authoring                         | `dnd-kit`                                                  |                                              |
| Flex timers for polling                               | TanStack Query `refetchInterval` / SSE                     |                                              |
| `ResourceManager` locales (`en_US`, `pt_BR`, `es_ES`) | `next-intl`                                                | Port existing `.properties` files            |

**Main challenges**

- **`[Bindable]` mindset.** Flex two-way binding encourages mutable view-model objects. React's unidirectional data flow + TanStack Query is a rewrite of thinking, not a translation. Budget discovery time.
- **Event dispatch / custom events.** Flex `EventDispatcher` maps to React props callbacks or a small event bus (`mitt`) for the few cross-tree cases.
- **Module loading.** Flex `ModuleLoader` dynamically loaded sub-apps. Next.js dynamic imports (`next/dynamic`) cover the same need for the rare case we keep it.

### 2.2 Data handling: SOAP/XML → JSON

- **Transport.** Client components call `/api/<resource>` (Next.js Route Handlers). No browser-side XML parsing.
- **Parser.** `fast-xml-parser` on the server with a per-endpoint adapter in `src/server/seagull/<resource>.ts`. Each adapter exports a typed client function (`getDashboards(): Promise<Dashboard[]>`). Zod schemas validate at the boundary.
- **Auth.** Seagull session cookie forwarded from the client request into the server-side `fetch`. A first-week prototype in P1 confirms the cookie name, domain, and CSRF behavior.
- **Observability.** Each route handler emits an OpenTelemetry span so latency regressions from adding the proxy hop are visible.

**Roadblocks to anticipate**

- Undocumented XML shapes (nullable elements, inconsistent casing, arrays-vs-single-element quirks). Mitigation: capture real responses into wiremock fixtures early (P0).
- Long-running seagull endpoints. Mitigation: Route Handler streaming + client-side `suspense` boundaries; escalate to SSE for anything > 2 s.
- CSRF/session edge cases. Mitigation: seagull session bridge prototype in P1 week 1.

### 2.3 Charting library recommendation

**Primary: [Apache ECharts](https://echarts.apache.org/) via `echarts-for-react`.**

- Covers every Flash chart type Davinci uses (line, area, bar, pie, gauge, radar, scatter, heatmap, tree, sankey).
- Canvas + SVG renderers, strong performance on 10k+ points.
- Mature time-series interactivity (zoom, brush, tooltip sync) — parity with Grafana panels.
- Apache 2.0 licensed.

**Complement: [Tremor](https://tremor.so/) for KPI tiles, small cards, progress bars.**

- Tailwind-native, looks cohesive with shadcn.

**Escape hatch: D3 v7** only where ECharts cannot express the visual (e.g., OpMon-specific CMDB topology renders — but those are in the out-of-scope `topology-html5` app today).

**Rejected:**

- **Chart.js** — fine for simple charts, but weaker on time-series interactivity at dashboard scale.
- **Recharts** — pleasant API, but performance cliffs above a few thousand points.
- **amCharts 5** — capable, but licensed.

---

## 3. Migration strategy & phased roadmap

### P0 — Discovery (2 weeks)

- Inventory every widget, chart, and screen in `main.mxml`.
- Map each widget to seagull endpoints using `docs/legacy/Documentacao API Integracao OpMon Dashboards.pdf`.
- Capture real XML responses into wiremock fixtures.
- Confirm session/auth bridge details with a throwaway spike.
- **Deliverable:** `docs/superpowers/specs/2026-05-13-widget-inventory.md`.

### P1 — MVP (6 weeks)

- Scaffold Next.js 15 App Router app, TypeScript strict, Tailwind, shadcn/ui, ESLint, Prettier, Vitest.
- Seagull session bridge + first Route Handler.
- One end-to-end dashboard type: line chart + KPI tiles + table.
- Docker dev stack (`web` + `mock-api` + `postgres`).
- CI (GitHub Actions): typecheck, lint, test, build.
- **Deliverable:** clickable single-dashboard demo against wiremock and against a real OpMon dev instance.

### P2 — Feature parity (10 weeks)

- Remaining widget types (≈10 total): gauge, column, pie, heatmap, status-grid, alert list, event timeline, group summary, uptime bar, SLA matrix.
- Dashboard authoring: drag/drop grid layout, add/remove widget, save definition (persisted via existing seagull endpoint), share URL, duplicate.
- Theming (light/dark) + OpMon brand tokens.
- i18n (`next-intl`): port `en_US`, `pt_BR`, `es_ES` from `flex/src/` locale files.
- Accessibility pass (keyboard nav, ARIA for charts).
- **Deliverable:** feature-complete parity with `main.mxml`.

### P3 — Hardening & cutover (4 weeks)

- Performance pass: bundle analysis, route-level code splitting, chart lazy-loading, p95 TTI budget.
- Observability: Sentry, OpenTelemetry traces on the proxy layer, RUM web-vitals.
- Playwright smoke suite on critical flows.
- Feature-flag rollout: seagull serves either the `.swf` bundle or redirects to the new `/dashboard-html/` route behind a tenant flag.
- Flex retirement checklist (for later phases): document opmap/scatmap/cmdbmap/viewer sunset order.
- **Deliverable:** production cutover of main dashboard; Flash `main.mxml` frozen.

### Calendar total: ~22 weeks.

---

## 4. Engineering estimation

| Track                                                                           | Hours      | Notes                                                                              |
| ------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| Infra (Next.js 15 + TS + Tailwind + shadcn + ESLint/Prettier + Vitest + CI)     | 40         | Foundation, one sprint                                                             |
| API layer (route handlers, XML parser, typed clients, Zod schemas, error model) | 120        | Grows with endpoint count                                                          |
| UI kit & theming (shadcn, design tokens, layout primitives, dark mode)          | 80         |                                                                                    |
| Dashboard widgets (~10 types × ~32 h avg)                                       | 320        | Line, KPI, table, gauge, column, pie, heatmap, status-grid, event list, SLA matrix |
| Dashboard authoring (dnd-kit, persistence, share URLs, duplicate)               | 140        |                                                                                    |
| Auth/session bridge with seagull                                                | 60         | Higher risk if CSRF quirks                                                         |
| Testing (Vitest unit, Playwright e2e) + observability (Sentry, OTel, RUM)       | 120        |                                                                                    |
| Docker dev stack + wiremock fixtures                                            | 40         | See §6                                                                             |
| **Total**                                                                       | **~920 h** |                                                                                    |

Team shape: **2 FE + 0.5 BE + 0.25 design**, ~22 calendar weeks.

> The 920 h estimate counts focused implementation work only. The 22-week calendar absorbs the remaining capacity (PR review, spikes, seagull/SOAP reverse-engineering, meetings, stakeholder demos, hardening) at a realistic ~38% utilization. If utilization is closer to 60%, compress to ~14 calendar weeks; below 30%, expect ~28.

---

## 5. Workspace structure

```
dashboard-html/
├── README.md
├── .gitignore
├── docker/
│   ├── Dockerfile               # Next.js dev/eval image
│   └── docker-compose.yml       # web + mock-api + postgres
├── docs/
│   ├── legacy/                  # migrated from ../dashboard/docs/
│   │   ├── Documentacao API Integracao OpMon Dashboards.docx
│   │   └── Documentacao API Integracao OpMon Dashboards.pdf
│   └── superpowers/
│       └── specs/
│           └── 2026-04-29-davinci-migration-design.md  (this file)
└── (app/, src/, package.json scaffolded in P1)
```

---

## 6. Docker templates (dev/evaluation only)

Production continues to ship as the existing OpMon RPM. The Compose stack below exists **only** to spin up a local demo environment instantly — without needing the legacy Flash environment running.

### 6.1 `docker/Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# --- deps stage ------------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile

# --- dev stage (used by docker-compose for `web` service) ------------------
FROM base AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]

# --- build stage -----------------------------------------------------------
FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm build

# --- runtime stage (production-grade image for evaluation demos) -----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nextjs \
 && adduser  --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Notes:

- Targets Next.js `output: "standalone"` — set in `next.config.ts`.
- `dev` stage is used by Compose; `runtime` stage is for the optional "pre-baked demo" image pushed to an internal registry.

### 6.2 `docker/docker-compose.yml`

```yaml
name: dashboard-html

services:
  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile
      target: dev
    container_name: dashboard-html-web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - SEAGULL_BASE_URL=http://mock-api:8080
      - DATABASE_URL=postgres://opmon:opmon@postgres:5432/opmon
    volumes:
      - ..:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      mock-api:
        condition: service_started
      postgres:
        condition: service_healthy
    restart: unless-stopped

  mock-api:
    image: wiremock/wiremock:3.9.1
    container_name: dashboard-html-mock-api
    ports:
      - "8080:8080"
    command: ["--global-response-templating", "--verbose"]
    volumes:
      - ./wiremock/mappings:/home/wiremock/mappings:ro
      - ./wiremock/__files:/home/wiremock/__files:ro
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: dashboard-html-postgres
    environment:
      - POSTGRES_USER=opmon
      - POSTGRES_PASSWORD=opmon
      - POSTGRES_DB=opmon
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/seed.sql:/docker-entrypoint-initdb.d/seed.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opmon -d opmon"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped

volumes:
  postgres-data:
```

**To run:** `docker compose -f docker/docker-compose.yml up --build` → app on `http://localhost:3000`, mocked PHP on `http://localhost:8080`.

---

## 7. Risks and mitigations

| #   | Risk                                                          | Likelihood | Impact | Mitigation                                                                              |
| --- | ------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------- |
| 1   | Undocumented SOAP/XML edge cases break the adapter layer      | High       | Medium | Capture real responses into wiremock fixtures in P0; Zod parse at boundary fails loudly |
| 2   | Seagull session/CSRF bridge harder than expected              | Medium     | High   | Prototype in P1 week 1 before any UI work                                               |
| 3   | Scope creep into viewer/scatmap/opmap/cmdbmap                 | High       | High   | Out-of-scope list in this spec; feature requests routed to Phase 2 planning             |
| 4   | SVN → git transition friction for team                        | Low        | Low    | Standalone new git repo; legacy SVN frozen for reference                                |
| 5   | Perf regression from proxy hop (XML → JSON)                   | Medium     | Medium | OTel spans on every Route Handler; p95 budget enforced in CI                            |
| 6   | "Grafana" quality bar interpreted differently by stakeholders | Medium     | Medium | Build a P1 demo early; anchor discussion on real pixels, not adjectives                 |
| 7   | i18n string drift vs Flex `.properties`                       | Medium     | Low    | Automated diff between Flex locales and `next-intl` catalogs in CI                      |

---

## 8. Build vs Buy — Davinci custom dashboard vs Grafana

| Axis                                         | Build (this plan)          | Buy (Grafana)                                                              |
| -------------------------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| Fits OpMon's CMDB data model                 | ✅ Native                  | ⚠️ Requires custom datasource plugin over seagull                          |
| Dashboard authoring UX inside OpMon          | ✅ Seamless                | ❌ Lives in Grafana UI, separate auth/permissions                          |
| Time-series panels (CPU, latency, etc.)      | ✅ ECharts                 | ✅ Built-in and best-in-class                                              |
| Alerting / incident views tied to CMDB items | ✅                         | ⚠️ Needs bridging                                                          |
| Time to first value                          | ~P1 (6 wk)                 | ~4 wk to a limited Grafana instance, +many weeks for the datasource plugin |
| Ongoing maintenance                          | OpServices owns every line | Tracking upstream Grafana + plugin API breaks                              |
| License                                      | Proprietary                | AGPL / Enterprise tiers                                                    |

**Recommendation: hybrid build.**

- **Build** the Davinci dashboard shell and authoring UX — it is OpMon's product surface and must stay integrated with CMDB and permissions.
- **Embed Grafana panels** (via iframe or `grafana-react`) for pure time-series use cases where customers already operate a Grafana. This lets OpMon leverage Grafana's panel library without inheriting its dashboard/authentication model.

---

## 9. Next steps (for implementation planning)

1. **User review of this spec.**
2. On approval, produce a detailed implementation plan (P1 tasks at story granularity) via the writing-plans flow.
3. Spike: seagull session/CSRF bridge (throwaway branch, time-boxed to 3 days).
4. Scaffold `dashboard-html/` app in P1 week 1.

---

## 10. Out of scope (explicit)

- Viewer module (`viewer.mxml` / `viewerModule.mxml`)
- Topology modules (`opmap.mxml`, `scatmap.mxml`, `scatmapModule.mxml`, `cmdbmap.mxml`)
- Mobile Flex build (`mobile/`)
- Existing `topology-html5/` CRA app (it continues to ship as-is; absorption deferred)
- PHP/seagull backend changes
- Production Docker deployment — evaluation/dev stack only
- RPM packaging changes

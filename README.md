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

# dashboard-html

Migration workspace for the OpMon **Davinci** main dashboard: ActionScript 3.5 / Flex → Next.js 15 + React 19 + TypeScript.

**Status:** Feasibility study complete. Implementation not started.

## Layout

- `docs/superpowers/specs/2026-04-29-davinci-migration-design.md` — feasibility study, architecture, roadmap, estimate, risks, build-vs-buy.
- `docs/legacy/` — OpMon Dashboards Integration API documentation migrated from the legacy repo.
- `docker/` — dev/evaluation-only Compose stack (`web` + `mock-api` + `postgres`).

## Scope

Main dashboard only (`flex/src/main.mxml` in the legacy repo). Viewer, opmap, scatmap, cmdbmap, and mobile remain on Flash for this phase.

## Local development

### Prerequisites

- Node 20 LTS
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker + Docker Compose

### First-time setup

```bash
cp .env.example .env.local
pnpm install
```

### Run everything in Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

- App: http://localhost:3000
- Mock API (WireMock admin): http://localhost:8080/\_\_admin
- Postgres: localhost:5432 (opmon / opmon)

### Run the Next app on the host, mock-api + postgres in Docker

```bash
docker compose -f docker/docker-compose.yml up -d mock-api postgres
SEAGULL_BASE_URL=http://localhost:8080 pnpm dev
```

### Tests

```bash
pnpm test                 # unit
pnpm e2e                  # playwright (needs mock-api running)
pnpm typecheck && pnpm lint && pnpm format:check
```

## Pointing at a real seagull backend

Set `SEAGULL_BASE_URL` to the PHP host (e.g. `https://opmon.example.com`) and make sure your browser has a valid seagull session cookie (log into OpMon in the same browser). The session cookie is forwarded server-side by the Route Handlers.

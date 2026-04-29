# dashboard-html

Migration workspace for the OpMon **Davinci** main dashboard: ActionScript 3.5 / Flex → Next.js 15 + React 19 + TypeScript.

**Status:** Feasibility study complete. Implementation not started.

## Layout

- `docs/superpowers/specs/2026-04-29-davinci-migration-design.md` — feasibility study, architecture, roadmap, estimate, risks, build-vs-buy.
- `docs/legacy/` — OpMon Dashboards Integration API documentation migrated from the legacy repo.
- `docker/` — dev/evaluation-only Compose stack (`web` + `mock-api` + `postgres`).

## Scope

Main dashboard only (`flex/src/main.mxml` in the legacy repo). Viewer, opmap, scatmap, cmdbmap, and mobile remain on Flash for this phase.

## Quickstart (once the Next.js app is scaffolded in P1)

```bash
docker compose -f docker/docker-compose.yml up --build
# web:        http://localhost:3000
# mock-api:   http://localhost:8080
# postgres:   localhost:5432 (opmon / opmon)
```

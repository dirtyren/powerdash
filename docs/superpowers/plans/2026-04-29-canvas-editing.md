# Dashboard Canvas Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the P2.1 `react-grid-layout` snap-grid editor with a freeform `react-rnd`-based canvas. Both view and edit routes render widgets as absolute-positioned elements inside a fixed-size canvas (per-dashboard `width`/`height`, default 1920×1080). Widget `x/y/w/h` now carry pixel values.

**Architecture:** `DashboardCanvas` (read-only) and `EditableDashboardCanvas` (edit) replace `DashboardGrid` and `EditableDashboardGrid`. `Dashboard` schema gains `width` and `height` (with `.catch()` defaults for legacy responses). Save path (T1–T5 of P2.1) is unchanged — `buildSaveDashboardBody` only needs to pass through the dashboard's width/height instead of hardcoded strings.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, TanStack Query v5, **`react-rnd`** (replaces `react-grid-layout`), Zod v3, Vitest v2, Playwright v1, WireMock 3.9.

**Spec:** `docs/superpowers/specs/2026-04-29-canvas-editing-design.md`.

**Sequencing principle:** tasks are ordered so the tree compiles and all tests pass after every commit. Old `DashboardGrid` / `EditableDashboardGrid` components are deleted only AFTER their replacements are wired in.

---

## File Structure

```
dashboard-html/
├── app/
│   └── dashboards/
│       └── [id]/
│           ├── page.tsx                       # MODIFY: use DashboardCanvas
│           └── edit/
│               └── page.tsx                   # MODIFY: use EditableDashboardCanvas; remove rgl CSS imports
├── src/
│   ├── components/
│   │   ├── DashboardCanvas.tsx                # CREATE: read-only absolute-positioned canvas
│   │   ├── DashboardGrid.tsx                  # DELETE (after page.tsx swap)
│   │   ├── EditableDashboardCanvas.tsx        # CREATE: edit canvas with react-rnd
│   │   └── EditableDashboardGrid.tsx          # DELETE (after edit/page.tsx swap)
│   └── server/
│       ├── schemas/
│       │   └── dashboard.ts                   # MODIFY: width/height on DashboardSchema
│       └── seagull/
│           ├── dashboards.ts                  # MODIFY: DetailEnvelopeSchema width/height
│           └── save-payload.ts                # MODIFY: pass through dashboard.width/height
├── docker/
│   └── wiremock/
│       └── __files/
│           └── get-dashboard-1.xml            # MODIFY: pixel coords + canvas width/height
├── tests/
│   ├── unit/
│   │   ├── dashboards.test.ts                 # MODIFY: pixel coords in fixtures
│   │   ├── save-payload.test.ts               # MODIFY: pixel coords; assert width/height passthrough
│   │   ├── save-dashboard.test.ts             # MODIFY: pixel coords in fixtures
│   │   └── api-dashboard-put.test.ts          # MODIFY: pixel coords in fixtures
│   └── e2e/
│       └── dashboard-edit.spec.ts             # MODIFY: drag coords for new pixel layout
└── package.json                               # react-rnd added; react-grid-layout + react-resizable + @types/react-grid-layout removed
```

---

## Task 1: Install `react-rnd`

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install**

```bash
cd /Users/alessandro.ren/dev/dashboard-html
pnpm add react-rnd@^10
```

`react-rnd` ships its own TypeScript types — no separate `@types/*` needed.

- [ ] **Step 2: Verify**

```bash
pnpm typecheck && pnpm build
```
Both must pass. Nothing imports `react-rnd` yet.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "chore: add react-rnd"
```

---

## Task 2: Schema — `Dashboard.width` / `Dashboard.height` + defaults

**Files:**
- Modify: `src/server/schemas/dashboard.ts`
- Modify: `src/server/seagull/dashboards.ts`
- Modify: `tests/unit/dashboards.test.ts`

- [ ] **Step 1: Update `src/server/schemas/dashboard.ts`**

Replace the `DashboardSchema` definition with:

```ts
export const DashboardSchema = DashboardSummarySchema.extend({
  width: z.coerce.number().int().positive().catch(1920),
  height: z.coerce.number().int().positive().catch(1080),
  widgets: z.array(WidgetRefSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;
```

`DashboardSummarySchema` is unchanged — list view doesn't need canvas dimensions.

- [ ] **Step 2: Update `DetailEnvelopeSchema` in `src/server/seagull/dashboards.ts`**

Current:
```ts
const DetailEnvelopeSchema = z.object({
  response: z.object({
    dashboard: DashboardSummarySchema.extend({
      widgets: z.object({ widget: z.array(WidgetRefSchema) }),
    }),
  }),
});
```

Replace with:
```ts
const DetailEnvelopeSchema = z.object({
  response: z.object({
    dashboard: DashboardSummarySchema.extend({
      width: z.coerce.number().int().positive().catch(1920),
      height: z.coerce.number().int().positive().catch(1080),
      widgets: z.object({ widget: z.array(WidgetRefSchema) }),
    }),
  }),
});
```

In `getDashboard`, the function currently does:
```ts
const { widgets, ...rest } = parsed.response.dashboard;
return { ...rest, widgets: widgets.widget };
```
That pattern already passes through the new width/height fields because they land in `...rest`. No change to the function body.

- [ ] **Step 3: Add a failing test for the default behavior**

Edit `tests/unit/dashboards.test.ts`. Add a new test inside the `describe("listDashboards"...)` file (create a new `describe("getDashboard")` block if one doesn't exist):

```ts
describe("getDashboard", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("populates canvas width/height from the response", async () => {
    const xml = `<?xml version="1.0"?>
      <response><dashboard>
        <id>1</id><name>Infra</name><owner>opuser</owner>
        <width>1600</width><height>900</height>
        <widgets>
          <widget>
            <id>w-cpu-kpi</id><kind>kpi</kind><title>CPU %</title>
            <x>20</x><y>20</y><w>260</w><h>160</h>
          </widget>
        </widgets>
      </dashboard></response>`;
    vi.stubGlobal(
      "fetch",
      () => Promise.resolve(new Response(xml, { status: 200 })),
    );
    const { getDashboard } = await import("@/server/seagull/dashboards");
    const d = await getDashboard("1");
    expect(d.width).toBe(1600);
    expect(d.height).toBe(900);
  });

  it("defaults canvas width/height when the response omits them", async () => {
    const xml = `<?xml version="1.0"?>
      <response><dashboard>
        <id>1</id><name>Infra</name><owner>opuser</owner>
        <widgets>
          <widget>
            <id>w-cpu-kpi</id><kind>kpi</kind><title>CPU %</title>
            <x>20</x><y>20</y><w>260</w><h>160</h>
          </widget>
        </widgets>
      </dashboard></response>`;
    vi.stubGlobal(
      "fetch",
      () => Promise.resolve(new Response(xml, { status: 200 })),
    );
    const { getDashboard } = await import("@/server/seagull/dashboards");
    const d = await getDashboard("1");
    expect(d.width).toBe(1920);
    expect(d.height).toBe(1080);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/unit/dashboards.test.ts
```
Expected: existing `listDashboards` tests + 2 new `getDashboard` tests PASS.

- [ ] **Step 5: Full suite**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
All pass.

- [ ] **Step 6: Commit**

```bash
git add src/server/schemas/dashboard.ts src/server/seagull/dashboards.ts tests/unit/dashboards.test.ts
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "feat(schema): Dashboard.width/height with .catch defaults"
```

---

## Task 3: Save-payload passes through dashboard width/height

**Files:**
- Modify: `src/server/seagull/save-payload.ts`
- Modify: `tests/unit/save-payload.test.ts`

- [ ] **Step 1: Update the existing test to require the new behavior**

Open `tests/unit/save-payload.test.ts`. The `dashboard` fixture at the top needs `width` and `height` (they are now required by the `Dashboard` type):

```ts
const dashboard: Dashboard = {
  id: "1",
  name: "Infrastructure Overview",
  owner: "opuser",
  width: 1600,
  height: 900,
  widgets: [
    { id: "w-cpu-kpi", kind: "kpi", title: "CPU %", x: 20, y: 20, w: 260, h: 160 },
    { id: "w-cpu-line", kind: "line", title: "CPU over time", x: 300, y: 20, w: 720, h: 320 },
  ],
};
```

Replace the test `"includes sensible defaults for acl, allmayview, timer, scale, width, height"` with one that asserts the dashboard's own width/height pass through:

```ts
it("emits dashboard canvas width/height (not hardcoded defaults)", () => {
  const body = buildSaveDashboardBody(dashboard);
  const jsonStr = new URLSearchParams(body).get("json");
  if (!jsonStr) throw new Error("json field missing");
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  expect(parsed.width).toBe("1600");
  expect(parsed.height).toBe("900");
});

it("includes sensible defaults for acl, allmayview, timer, scale", () => {
  const body = buildSaveDashboardBody(dashboard);
  const jsonStr = new URLSearchParams(body).get("json");
  if (!jsonStr) throw new Error("json field missing");
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  expect(parsed.acl).toBe("0");
  expect(parsed.allmayview).toBe("1");
  expect(parsed.timer).toBe("15000");
  expect(parsed.scale).toBe("1");
  expect(parsed.scalestretch).toBe("1");
});
```

The other three tests (single 'json' field; envelope fields; empty-string AMF fields; special chars) stay.

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test tests/unit/save-payload.test.ts
```
Expected: FAIL — `parsed.width` is `"1920"` (hardcoded) not `"1600"`.

- [ ] **Step 3: Implement**

Edit `src/server/seagull/save-payload.ts`. Replace:

```ts
width: "1920",
height: "1080",
```

with:

```ts
width: String(dashboard.width),
height: String(dashboard.height),
```

Everything else in the envelope builder stays.

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/unit/save-payload.test.ts
```
Expected: all 5 PASS.

- [ ] **Step 5: Full suite**

```bash
pnpm lint && pnpm typecheck && pnpm test
```
Note: `save-dashboard.test.ts` and `api-dashboard-put.test.ts` inline dashboard objects that now need `width` and `height` fields — the TypeScript compiler will fail those tests. Fix them in **Task 4** and **Task 5** below. For now, typecheck will fail; that's expected at this intermediate step. Commit this task's changes with the caveat.

If you want a green intermediate commit, run Tasks 3+4+5 as a batch and commit only at the end of Task 5. That's fine — document the choice in the commit message.

- [ ] **Step 6: Commit (pairs with Task 4 & 5)**

After Task 4 and Task 5 are done, commit all three together:

```bash
git add src/server/seagull/save-payload.ts tests/unit/save-payload.test.ts \
        tests/unit/save-dashboard.test.ts tests/unit/api-dashboard-put.test.ts
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "feat(save): pass dashboard canvas width/height through save payload"
```

---

## Task 4: Update `save-dashboard.test.ts` fixture coords and dashboard shape

**Files:**
- Modify: `tests/unit/save-dashboard.test.ts`

- [ ] **Step 1: Update every `saveDashboard(...)` call and every echo XML**

Every inline `{ id, name, owner, widgets }` object passed to `saveDashboard` now needs `width` and `height`. Every XML echo that represents a dashboard should include `<width>1920</width><height>1080</height>` (so the re-fetch in the success test round-trips cleanly).

In the success test:

```ts
// replace the dashboard object in the call
const result = await saveDashboard({
  id: "1",
  name: "Infra",
  owner: "opuser",
  width: 1920,
  height: 1080,
  widgets: [
    { id: "w-cpu-kpi", kind: "kpi", title: "CPU %", x: 20, y: 20, w: 260, h: 160 },
  ],
});
```

and the echo XML:

```ts
const echoXml = `<?xml version="1.0"?>
  <response><dashboard>
    <id>1</id><name>Infra</name><owner>opuser</owner>
    <width>1920</width><height>1080</height>
    <widgets>
      <widget><id>w-cpu-kpi</id><kind>kpi</kind><title>CPU %</title>
        <x>20</x><y>20</y><w>260</w><h>160</h></widget>
    </widgets>
  </dashboard></response>`;
```

For the `-2` error test and the 5xx test, the inline `saveDashboard` call needs the same width/height fields (even though the test exits before the echo fetch):
```ts
await expect(
  saveDashboard({ id: "1", name: "x", owner: "y", width: 1920, height: 1080, widgets: [] }),
).rejects.toBeInstanceOf(SaveDashboardError);
```

- [ ] **Step 2: Run tests**

```bash
pnpm test tests/unit/save-dashboard.test.ts
```
Expected: 3 PASS (count and names unchanged).

---

## Task 5: Update `api-dashboard-put.test.ts` fixture coords and dashboard shape

**Files:**
- Modify: `tests/unit/api-dashboard-put.test.ts`

- [ ] **Step 1: Update the `detailXml` constant and widget coords**

At the top of the file, update `detailXml`:

```ts
const detailXml = `<?xml version="1.0"?>
  <response><dashboard><id>1</id><name>Infra</name><owner>opuser</owner>
    <width>1920</width><height>1080</height>
    <widgets>
      <widget><id>w-cpu-kpi</id><kind>kpi</kind><title>CPU %</title>
        <x>20</x><y>20</y><w>260</w><h>160</h></widget>
    </widgets>
  </dashboard></response>`;
```

In every `makeRequest({ widgets: [...] })` body, the widget coordinates passed to the API should be pixel-sized to match what a user would actually edit:

```ts
makeRequest({
  widgets: [
    { id: "w-cpu-kpi", kind: "kpi", title: "CPU %", x: 20, y: 20, w: 260, h: 160 },
  ],
})
```

The 422 invalid-body test stays the same (it intentionally sends broken fields). The 409 and 502 cases reuse the pixel-coord shape:

```ts
makeRequest({
  widgets: [{ id: "w", kind: "kpi", title: "T", x: 10, y: 10, w: 100, h: 100 }],
})
```

- [ ] **Step 2: Run tests**

```bash
pnpm test tests/unit/api-dashboard-put.test.ts
```
Expected: 4 PASS.

- [ ] **Step 3: Full suite**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
All pass. Test count unchanged.

- [ ] **Step 4: Commit (the Task 3 + 4 + 5 batch)**

```bash
git add src/server/seagull/save-payload.ts \
        tests/unit/save-payload.test.ts \
        tests/unit/save-dashboard.test.ts \
        tests/unit/api-dashboard-put.test.ts
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "feat(save): pass dashboard canvas width/height through save payload

Also updates unit-test fixtures to the pixel-coordinate + width/height shape
that Dashboard objects now carry after the canvas migration."
```

---

## Task 6: Update WireMock fixture `get-dashboard-1.xml` to canvas shape

**Files:**
- Modify: `docker/wiremock/__files/get-dashboard-1.xml`

- [ ] **Step 1: Replace the file contents**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <dashboard>
    <id>1</id>
    <name>Infrastructure Overview</name>
    <owner>opuser</owner>
    <width>1920</width>
    <height>1080</height>
    <widgets>
      <widget>
        <id>w-cpu-kpi</id>
        <kind>kpi</kind>
        <title>CPU %</title>
        <x>20</x><y>20</y><w>260</w><h>160</h>
      </widget>
      <widget>
        <id>w-cpu-line</id>
        <kind>line</kind>
        <title>CPU over time</title>
        <x>300</x><y>20</y><w>720</w><h>320</h>
      </widget>
      <widget>
        <id>w-hosts-table</id>
        <kind>table</kind>
        <title>Hosts</title>
        <x>20</x><y>360</y><w>1000</w><h>320</h>
      </widget>
    </widgets>
  </dashboard>
</response>
```

- [ ] **Step 2: Boot mock-api + verify**

```bash
docker compose -f docker/docker-compose.yml up -d mock-api
for i in $(seq 1 20); do curl -sf http://localhost:8080/__admin > /dev/null && break; sleep 1; done
curl -s http://localhost:8080/dashboards/1.xml | grep -E "width|height|<x>"
```

Expected output includes `<width>1920</width>`, `<height>1080</height>`, and widget `<x>` values 20, 300, 20.

- [ ] **Step 3: Teardown**

```bash
docker compose -f docker/docker-compose.yml down
```

- [ ] **Step 4: Commit**

```bash
git add docker/wiremock/__files/get-dashboard-1.xml
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "test(wiremock): canvas-shaped fixture (pixel coords + 1920x1080)"
```

---

## Task 7: Create `DashboardCanvas` (read-only renderer)

**Files:**
- Create: `src/components/DashboardCanvas.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import { KpiTile } from "@/components/widgets/KpiTile";
import { LineChart } from "@/components/widgets/LineChart";
import { DataTable } from "@/components/widgets/DataTable";

function WidgetByKind({ widget }: { widget: WidgetRef }) {
  switch (widget.kind) {
    case "kpi":
      return <KpiTile widgetId={widget.id} title={widget.title} />;
    case "line":
      return <LineChart widgetId={widget.id} title={widget.title} />;
    case "table":
      return <DataTable widgetId={widget.id} title={widget.title} />;
    default: {
      const _exhaustive: never = widget.kind;
      return <div>Unsupported: {_exhaustive}</div>;
    }
  }
}

interface Props {
  width: number;
  height: number;
  widgets: WidgetRef[];
}

export function DashboardCanvas({ width, height, widgets }: Props) {
  return (
    <div className="overflow-auto">
      <div
        className="relative mx-auto border border-border bg-card"
        style={{ width, height }}
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            data-widget-id={w.id}
            className="absolute"
            style={{ left: w.x, top: w.y, width: w.w, height: w.h }}
          >
            <WidgetByKind widget={w} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```
Pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/DashboardCanvas.tsx
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "feat: DashboardCanvas read-only renderer"
```

---

## Task 8: Create `EditableDashboardCanvas` (edit with react-rnd)

**Files:**
- Create: `src/components/EditableDashboardCanvas.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { Rnd } from "react-rnd";
import type { WidgetRef } from "@/server/schemas/widget";
import { KpiTile } from "@/components/widgets/KpiTile";
import { LineChart } from "@/components/widgets/LineChart";
import { DataTable } from "@/components/widgets/DataTable";

function WidgetByKind({ widget }: { widget: WidgetRef }) {
  switch (widget.kind) {
    case "kpi":
      return <KpiTile widgetId={widget.id} title={widget.title} />;
    case "line":
      return <LineChart widgetId={widget.id} title={widget.title} />;
    case "table":
      return <DataTable widgetId={widget.id} title={widget.title} />;
    default: {
      const _exhaustive: never = widget.kind;
      return <div>Unsupported: {_exhaustive}</div>;
    }
  }
}

interface Props {
  width: number;
  height: number;
  widgets: WidgetRef[];
  onChange: (next: WidgetRef[]) => void;
}

export function EditableDashboardCanvas({ width, height, widgets, onChange }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<WidgetRef>) =>
    onChange(widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const remove = (id: string) =>
    onChange(widgets.filter((w) => w.id !== id));

  return (
    <div className="overflow-auto">
      <div
        className="relative mx-auto border border-border bg-card"
        style={{ width, height }}
      >
        {widgets.map((w) => (
          <Rnd
            key={w.id}
            position={{ x: w.x, y: w.y }}
            size={{ width: w.w, height: w.h }}
            bounds="parent"
            cancel=".widget-remove-button"
            onDragStop={(_, d) =>
              update(w.id, { x: Math.round(d.x), y: Math.round(d.y) })
            }
            onResizeStop={(_, __, ref, ___, pos) =>
              update(w.id, {
                x: Math.round(pos.x),
                y: Math.round(pos.y),
                w: parseInt(ref.style.width, 10),
                h: parseInt(ref.style.height, 10),
              })
            }
          >
            <div
              data-widget-id={w.id}
              className="relative h-full w-full"
              onMouseEnter={() => setHoveredId(w.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {hoveredId === w.id && (
                <button
                  type="button"
                  aria-label={`Remove ${w.title}`}
                  className="widget-remove-button absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-sm hover:bg-red-500 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(w.id);
                  }}
                >
                  ×
                </button>
              )}
              <WidgetByKind widget={w} />
            </div>
          </Rnd>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint + build**

```bash
pnpm lint && pnpm typecheck && pnpm build
```

If `react-rnd`'s types conflict with `exactOptionalPropertyTypes: true`, suppress with targeted `// eslint-disable-next-line` or narrow prop types at the call site. Do NOT broaden tsconfig.

- [ ] **Step 3: Commit**

```bash
git add src/components/EditableDashboardCanvas.tsx
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "feat: EditableDashboardCanvas with react-rnd + remove overlay"
```

---

## Task 9: Swap detail page to use `DashboardCanvas`

**Files:**
- Modify: `app/dashboards/[id]/page.tsx`

- [ ] **Step 1: Change the import and the render call**

Find the line:
```tsx
import { DashboardGrid } from "@/components/DashboardGrid";
```
Replace with:
```tsx
import { DashboardCanvas } from "@/components/DashboardCanvas";
```

Find the render line:
```tsx
<DashboardGrid widgets={data.widgets} />
```
Replace with:
```tsx
<DashboardCanvas width={data.width} height={data.height} widgets={data.widgets} />
```

No other changes to this file.

- [ ] **Step 2: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
All pass.

- [ ] **Step 3: Commit**

```bash
git add app/dashboards/[id]/page.tsx
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "feat: detail page renders DashboardCanvas"
```

---

## Task 10: Swap edit page to use `EditableDashboardCanvas` and drop rgl CSS

**Files:**
- Modify: `app/dashboards/[id]/edit/page.tsx`

- [ ] **Step 1: Replace imports and render**

Delete these three import lines from the top of the file:
```tsx
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { EditableDashboardGrid } from "@/components/EditableDashboardGrid";
```

Add:
```tsx
import { EditableDashboardCanvas } from "@/components/EditableDashboardCanvas";
```

Find the render line:
```tsx
<EditableDashboardGrid widgets={editWidgets} onChange={setEditWidgets} />
```
Replace with:
```tsx
<EditableDashboardCanvas
  width={data.width}
  height={data.height}
  widgets={editWidgets}
  onChange={setEditWidgets}
/>
```

The `data.width`/`data.height` expressions are safe here because this render branch is guarded by `{data && editWidgets !== null && (...)}`.

- [ ] **Step 2: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
All pass.

- [ ] **Step 3: Commit**

```bash
git add app/dashboards/[id]/edit/page.tsx
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "feat: edit page renders EditableDashboardCanvas"
```

---

## Task 11: Delete old grid components and remove `react-grid-layout` dep

**Files:**
- Delete: `src/components/DashboardGrid.tsx`, `src/components/EditableDashboardGrid.tsx`
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Delete the components**

```bash
cd /Users/alessandro.ren/dev/dashboard-html
rm src/components/DashboardGrid.tsx src/components/EditableDashboardGrid.tsx
```

- [ ] **Step 2: Remove the deps**

```bash
pnpm remove react-grid-layout react-resizable @types/react-grid-layout
```

- [ ] **Step 3: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
All pass. Build shows neither package in the bundle.

- [ ] **Step 4: Commit**

```bash
git add -A
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "chore: remove react-grid-layout + old grid components"
```

---

## Task 12: Update Playwright E2E for pixel coordinates

**Files:**
- Modify: `tests/e2e/dashboard-edit.spec.ts`

- [ ] **Step 1: Replace the top-of-file comment and drag logic**

Open the file. Keep the intro comment but refresh it:

```ts
// NOTE: Because the WireMock `/dashboards/1.xml` mapping serves a static
// fixture, reloading after save will show the ORIGINAL widget positions,
// not the dragged ones. This test asserts the save round-trip succeeds
// (no error banner, URL returns to /dashboards/1) without asserting
// cross-session persistence. A richer persistence check would require
// a WireMock scenario state machine — deferred to a later plan.
```

The test body's drag math needs a small update. In the current P2.1 selector we targeted `.react-grid-item[data-widget-id="w-cpu-kpi"]`. Under `react-rnd`, the widget's `<div>` is a direct child of a positioned `<div>` that `react-rnd` renders; the `data-widget-id` attribute is on our inner `<div>`. The `<Rnd>` wrapper does not expose `data-widget-id` itself. The draggable target is therefore the `<Rnd>` wrapper, which is the parent of our `[data-widget-id]` div.

Rewrite the drag block:

```tsx
// The Rnd component wraps our inner div that carries data-widget-id.
// The parent (the actual draggable) is the nearest ancestor with inline
// style left/top values.
const cpuTile = page.locator(
  '[data-widget-id="w-cpu-kpi"]',
).locator("xpath=ancestor::div[contains(@style,\"left\") and contains(@style,\"top\")][1]");
await expect(cpuTile).toBeVisible({ timeout: 15_000 });

const box = await cpuTile.boundingBox();
if (!box) throw new Error("CPU tile has no bounding box");

// Drag the tile ~200 px right, ~150 px down. The fixture puts the tile
// at canvas pixel (20, 20); dragging lands it around (220, 170).
await page.mouse.move(box.x + 20, box.y + 20);
await page.mouse.down();
await page.mouse.move(box.x + 220, box.y + 170, { steps: 10 });
await page.mouse.up();

await expect(page.getByText(/unsaved changes/)).toBeVisible({ timeout: 5_000 });
```

Rest of the test (click Save, URL back to `/dashboards/1`, no error banner) stays the same.

- [ ] **Step 2: Run the test**

```bash
docker compose -f docker/docker-compose.yml up -d mock-api
for i in $(seq 1 30); do curl -sf http://localhost:8080/__admin > /dev/null && break; sleep 1; done
SEAGULL_BASE_URL=http://localhost:8080 pnpm e2e
```

Expected: 2 tests pass (P1 smoke + canvas edit).

If the XPath selector doesn't match, `react-rnd` uses CSS `transform: translate(...)` instead of `left`/`top` for positioning. In that case use:

```ts
const cpuTile = page.locator(
  '[data-widget-id="w-cpu-kpi"]',
).locator("xpath=ancestor::div[contains(@style,\"transform\")][1]");
```

Try the `left/top` selector first; fall back to `transform` only if needed. Document whichever worked at the top of the test.

Teardown:
```bash
docker compose -f docker/docker-compose.yml down
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/dashboard-edit.spec.ts
git -c user.email=dashboard@opservices.local -c user.name="Davinci Migration" commit -m "test(e2e): drag canvas widget (react-rnd) instead of grid item"
```

---

## Task 13: Final clean-slate verification

- [ ] **Step 1: Clean slate**

```bash
cd /Users/alessandro.ren/dev/dashboard-html
docker compose -f docker/docker-compose.yml down -v 2>/dev/null || true
rm -rf .next node_modules
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
docker compose -f docker/docker-compose.yml up -d mock-api
for i in $(seq 1 30); do curl -sf http://localhost:8080/__admin > /dev/null && break; sleep 1; done
SEAGULL_BASE_URL=http://localhost:8080 pnpm e2e
docker compose -f docker/docker-compose.yml down
```

Every step must succeed. Expected totals:
- Unit tests: 27 (same count as P2.1 — the schema-default tests net-add 2, save-payload net adds 0, save-dashboard / api-dashboard-put / dashboards shapes change but count is stable).
- E2E tests: 2.

- [ ] **Step 2: Rebuild the running dev container (so the demo picks up new deps/code)**

```bash
docker compose -f docker/docker-compose.yml up -d --build web mock-api postgres
```

Wait ~20 s for Next to warm, then:
```bash
curl -s http://localhost:3000/dashboards/1 | grep -o "Edit"
```
Expected: the response HTML contains `Edit` (confirms the new bundle is being served).

- [ ] **Step 3: Manual browser smoke**

Open `http://localhost:3000`. Click "Infrastructure Overview". Header shows `Edit` button. Click → `/dashboards/1/edit`. The three widgets render at their pixel positions (CPU KPI top-left, CPU line to its right, hosts table below). Drag the line chart somewhere else — the drag moves pixel-by-pixel, no snap. Resize via a corner handle. Hover a widget → `×` appears → click to remove. Save → returns to view route with no error banner.

Tear down when done.

- [ ] **Step 4: Report**

Summarize:
- Commits in this plan (`df1935f` exclusive → HEAD)
- Test counts before/after
- Dep delta: `react-grid-layout`, `react-resizable`, `@types/react-grid-layout` REMOVED; `react-rnd` ADDED
- File delta: 2 components deleted (`DashboardGrid`, `EditableDashboardGrid`), 2 components added (`DashboardCanvas`, `EditableDashboardCanvas`), backend files modified per spec
- Known follow-ups (unchanged from P2.1):
  - `widgets` field still an assumed extension against real seagull
  - No UI to change canvas `width`/`height` (only schema default or backend value)
  - No snap/alignment aids (by design)

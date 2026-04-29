# Dashboard Canvas Editing (Design)

**Date:** 2026-04-29
**Status:** Draft (pending user review)
**Supersedes:** the `react-grid-layout` UX introduced in P2.1. Backend/adapter work from P2.1 (T1–T5) is reused unchanged.
**Predecessor plan:** `2026-04-29-plan-2.1-edit-existing-dashboard.md`

---

## 1. Goal

Replace the 12-column snap-grid editing UX introduced in P2.1 with a freeform, pixel-positioned **canvas** editor. Widgets are absolute-positioned inside a fixed-size canvas (dashboard-configurable `width × height`, default `1920×1080`). Both the read route (`/dashboards/[id]`) and the edit route (`/dashboards/[id]/edit`) switch to canvas rendering.

## 2. Rationale

- The legacy OpMon **Davinci** product was, as its name suggests, a canvas-style dashboard drawing tool. Its persisted state (AMF `diagram` blob) stores widget positions in pixels, not grid cells. A canvas UX matches the product the HTML migration is replacing.
- The 12-col grid was an arbitrary choice the plan made — the user request was "I want to select widgets and build the dashboard." A snap-grid is harder, not easier, for that user.
- `react-grid-layout`'s behaviors (collision/push, responsive breakpoints) are overhead for what amounts to pixel placement.

## 3. Decisions fixed during brainstorming

| Question | Answer |
|---|---|
| Replace P2.1 grid, add alongside, or only swap edit? | **Replace entirely** — both view and edit use canvas. |
| Coordinate unit | **Pixels, reinterpret existing `x/y/w/h` fields.** No new schema fields for widget positions. |
| Canvas dimensions | **Fixed per-dashboard**, stored on the `Dashboard` schema. Default `1920×1080`. |
| Snap / alignment aids | **None** — pure freeform. Future work only. |
| Implementation library | **`react-rnd`** — single `<Rnd>` does drag + resize for absolute-positioned elements. |

## 4. Schema changes

### 4.1 `Dashboard`
Add `width` and `height`:
```ts
export const DashboardSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().min(1),
});

export const DashboardSchema = DashboardSummarySchema.extend({
  width: z.coerce.number().int().positive().catch(1920),
  height: z.coerce.number().int().positive().catch(1080),
  widgets: z.array(WidgetRefSchema),
});
```
`.catch()` provides a safe default if a legacy seagull response omits the fields. Listing dashboards does not include canvas dimensions (summary unchanged).

### 4.2 `WidgetRef`
No shape change. Constraints stay:
```ts
export const WidgetRefSchema = z.object({
  id: z.string().min(1),
  kind: WidgetKindSchema,
  title: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});
```
The numbers are now pixel values rather than grid cells. No code change required in the schema file; only WireMock fixtures and tests need pixel-scale values.

## 5. Architecture

### 5.1 Files to delete
- `src/components/DashboardGrid.tsx` (read-only 12-col renderer)
- `src/components/EditableDashboardGrid.tsx` (P2.1 grid editor)
- `react-grid-layout/css/styles.css` + `react-resizable/css/styles.css` imports in `app/dashboards/[id]/edit/page.tsx`

### 5.2 Deps
- **Remove:** `react-grid-layout`, `react-resizable`, `@types/react-grid-layout`.
- **Add:** `react-rnd` (latest release that lists React 19 peer support; ~10 KB gz).

### 5.3 Files to create

`src/components/DashboardCanvas.tsx` (read-only):
```tsx
"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import { KpiTile } from "@/components/widgets/KpiTile";
import { LineChart } from "@/components/widgets/LineChart";
import { DataTable } from "@/components/widgets/DataTable";

function WidgetByKind({ widget }: { widget: WidgetRef }) {
  switch (widget.kind) {
    case "kpi":    return <KpiTile widgetId={widget.id} title={widget.title} />;
    case "line":   return <LineChart widgetId={widget.id} title={widget.title} />;
    case "table":  return <DataTable widgetId={widget.id} title={widget.title} />;
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

`src/components/EditableDashboardCanvas.tsx` (edit):
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
    case "kpi":    return <KpiTile widgetId={widget.id} title={widget.title} />;
    case "line":   return <LineChart widgetId={widget.id} title={widget.title} />;
    case "table":  return <DataTable widgetId={widget.id} title={widget.title} />;
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
                    onChange(widgets.filter((x) => x.id !== w.id));
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

### 5.4 Files to modify

`src/server/schemas/dashboard.ts` — add width/height to `DashboardSchema` per §4.1.

`src/server/seagull/dashboards.ts` — `DetailEnvelopeSchema` picks up width/height with `.catch` defaults:
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
The `getDashboard` return now carries width/height. No other adapter change.

`src/server/seagull/save-payload.ts` — emit dashboard's width/height instead of hardcoded strings:
```ts
width: String(dashboard.width),
height: String(dashboard.height),
```

`app/dashboards/[id]/page.tsx` — swap `DashboardGrid` → `DashboardCanvas`; pass `width`/`height`.

`app/dashboards/[id]/edit/page.tsx` — swap `EditableDashboardGrid` → `EditableDashboardCanvas`; remove `react-grid-layout/css/styles.css` and `react-resizable/css/styles.css` imports.

`docker/wiremock/__files/get-dashboard-1.xml` — add `<width>1920</width><height>1080</height>` to `<dashboard>`; rewrite widget coords to realistic pixel values. Proposed layout:
- KPI CPU %: x=20, y=20, w=260, h=160
- Line chart CPU over time: x=300, y=20, w=720, h=320
- Hosts table: x=20, y=360, w=1000, h=320

Unit test fixtures (`tests/unit/save-payload.test.ts`, `save-dashboard.test.ts`, `dashboards.test.ts`, `api-dashboard-put.test.ts`, `xml.test.ts` as needed) — update any inline WidgetRef examples to pixel values for narrative consistency. Correctness doesn't require the update (values are just integers), but readability benefits.

`tests/e2e/dashboard-edit.spec.ts` — the drag math continues to work (drag CPU tile from its bounding box `(20, 20)` by `(+400, +300)` to roughly `(420, 320)`) once the new fixture is in place.

## 6. Data flow

GET flow: `useDashboard(id)` → `/api/dashboards/:id` → `getDashboard` → `DashboardCanvas({ width, height, widgets })`.

Edit flow: `/dashboards/:id/edit` loads same data → `EditableDashboardCanvas` renders widgets inside `<Rnd>`. User drags/resizes → `onChange(updatedWidgets)` → dirty flag in page state → Save → `useSaveDashboard` → existing PUT handler → existing `saveDashboard` adapter → seagull → re-GET → navigate back to view. Backend pipeline unchanged from P2.1.

## 7. Error handling

No new failure modes. All P2.1 error handling (SaveDashboardError → 409/402/403, SeagullError → 502) is unchanged. The `<Rnd>` widgets update local state only; nothing is persisted until Save.

One edge: a widget dragged so `bounds="parent"` caps it at the canvas edge. If the dashboard's canvas later shrinks (user resizes canvas width/height in a future plan), some widgets may render off-screen. Scroll within the outer `overflow-auto` handles this visually; no data mutation is needed.

## 8. Testing

- Unit tests update fixtures to pixel coords where it improves clarity; no new unit tests specifically for the canvas components (they are thin wrappers around `<Rnd>` and absolute positioning, covered by E2E).
- Add one unit test confirming `DetailEnvelopeSchema.catch` defaults fire when `width`/`height` are missing from the seagull response.
- E2E continues to cover the full flow: navigate to view, click Edit, drag CPU tile, Save, return to view.

## 9. Estimate

| Track | Hours |
|---|---|
| Remove `react-grid-layout` + `EditableDashboardGrid` + `DashboardGrid` + CSS imports | 2 |
| Install `react-rnd`; create `DashboardCanvas` + `EditableDashboardCanvas` | 10 |
| Schema width/height + adapter + `DetailEnvelopeSchema.catch` defaults | 4 |
| `buildSaveDashboardBody` width/height passthrough | 1 |
| WireMock + unit test fixture rewrites to pixel coords | 4 |
| E2E update + clean-slate verification | 3 |
| **Total** | **~24 h** |

Team shape: 1 FE. Calendar: ~1 week at realistic utilization.

## 10. Migration / compatibility

- **Previously persisted "grid" dashboards (hypothetical).** If any dashboard had been persisted via P2.1 to a real OpMon instance (it had not — the `widgets` field is still a documented assumption), its widgets would carry values in the 0–11 range and would render at pixel coordinates 0–11 after this change (tiny overlap at the top-left corner). Since no such data exists, no migration code is needed. A note goes into `docs/seagull-save-api.md` about the semantic change of `x/y/w/h`.
- **Legacy Flex dashboards** have never been read by this HTML app (their layout is in the opaque AMF `diagram` blob, which the HTML client cannot deserialize). No impact.

## 11. Out of scope

- Canvas size editing in the UI (for now, `width`/`height` are either set by default 1920×1080 on new dashboards or arrive from the backend; no UI toggle to change them).
- Alignment guides / snap / rulers.
- Zoom / pan the canvas.
- Touch-device support for edit mode.
- Creating new dashboards (still deferred to the planned P2.2 brainstorm).
- Layer order (z-index) for overlapping widgets — widgets are assumed not to overlap; if they do, DOM order wins.
- Undo/redo.

## 12. Next steps

1. User review of this spec.
2. On approval, produce the implementation plan via writing-plans.
3. Execute plan via subagent-driven-development.

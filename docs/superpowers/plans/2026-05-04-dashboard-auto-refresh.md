# Dashboard Auto-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a session-only auto-refresh interval dropdown (Off / 5s / 30s / 1m / 5m / 15m) to the dashboard view page header that drives refetching for every widget on the page.

**Architecture:** A `RefreshIntervalContext` owned by the view page exposes the selected interval. The existing `useQueryRange` / `useQueryInstant` hooks fall back to this context value when the caller does not pass `refetchIntervalMs`. The resolution logic is extracted into a pure helper so it can be unit-tested without async/timers. The dropdown itself is a native `<select>` — the codebase's `components/ui` directory only contains `button` and `card`, so no Select primitive is introduced.

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript strict, TanStack Query v5, vitest + happy-dom + React Testing Library, Playwright.

---

## File Structure

- **Create:** `src/contexts/RefreshIntervalContext.tsx` — context + provider + `useRefreshInterval` hook.
- **Create:** `src/hooks/resolve-refetch-interval.ts` — pure helper that turns (explicit option, context value) into the value React Query wants.
- **Create:** `src/components/RefreshIntervalSelect.tsx` — controlled native `<select>` with six options.
- **Modify:** `src/hooks/useQueryRange.ts` — read context, use helper, drop hardcoded 15 s default.
- **Modify:** `src/hooks/useQueryInstant.ts` — same treatment.
- **Modify:** `app/dashboards/[id]/page.tsx` — own the interval state, mount provider + select.
- **Modify:** `app/prometheus-demo/page.tsx` — pass `refetchIntervalMs: 15_000` explicitly to preserve current 15 s cadence now that the hook no longer defaults.
- **Create:** `tests/unit/RefreshIntervalContext.test.tsx`
- **Create:** `tests/unit/resolve-refetch-interval.test.ts`
- **Create:** `tests/unit/RefreshIntervalSelect.test.tsx`
- **Create:** `tests/e2e/dashboard-auto-refresh.spec.ts`

---

## Task 1: Refresh interval context

**Files:**
- Create: `src/contexts/RefreshIntervalContext.tsx`
- Test: `tests/unit/RefreshIntervalContext.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/unit/RefreshIntervalContext.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RefreshIntervalProvider,
  useRefreshInterval,
} from "@/contexts/RefreshIntervalContext";

function Probe() {
  const v = useRefreshInterval();
  return <span data-testid="probe">{v === null ? "null" : String(v)}</span>;
}

describe("RefreshIntervalContext", () => {
  it("returns null when no provider is mounted", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("null");
  });

  it("returns the provider value", () => {
    render(
      <RefreshIntervalProvider value={30_000}>
        <Probe />
      </RefreshIntervalProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("30000");
  });

  it("returns null when the provider value is null (Off)", () => {
    render(
      <RefreshIntervalProvider value={null}>
        <Probe />
      </RefreshIntervalProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("null");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- RefreshIntervalContext`
Expected: FAIL — module `@/contexts/RefreshIntervalContext` does not exist.

- [ ] **Step 3: Implement the context**

Create `src/contexts/RefreshIntervalContext.tsx`:

```tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";

export type RefreshIntervalMs = number | null;

const RefreshIntervalContext = createContext<RefreshIntervalMs>(null);

export function RefreshIntervalProvider({
  value,
  children,
}: {
  value: RefreshIntervalMs;
  children: ReactNode;
}) {
  return (
    <RefreshIntervalContext.Provider value={value}>
      {children}
    </RefreshIntervalContext.Provider>
  );
}

export function useRefreshInterval(): RefreshIntervalMs {
  return useContext(RefreshIntervalContext);
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- RefreshIntervalContext`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/contexts/RefreshIntervalContext.tsx tests/unit/RefreshIntervalContext.test.tsx
git commit -m "feat(dashboard): add RefreshIntervalContext for auto-refresh"
```

---

## Task 2: Pure `resolveRefetchInterval` helper

**Files:**
- Create: `src/hooks/resolve-refetch-interval.ts`
- Test: `tests/unit/resolve-refetch-interval.test.ts`

This encapsulates the priority rule so hook changes are trivial and all edge
cases are covered without touching React Query.

- [ ] **Step 1: Write failing test**

Create `tests/unit/resolve-refetch-interval.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveRefetchInterval } from "@/hooks/resolve-refetch-interval";

describe("resolveRefetchInterval", () => {
  it("uses an explicit number option over the context", () => {
    expect(resolveRefetchInterval(5_000, 30_000)).toBe(5_000);
  });

  it("treats an explicit null option as 'off', overriding the context", () => {
    expect(resolveRefetchInterval(null, 30_000)).toBe(false);
  });

  it("falls back to the context number when option is undefined", () => {
    expect(resolveRefetchInterval(undefined, 30_000)).toBe(30_000);
  });

  it("returns false when option is undefined and context is null", () => {
    expect(resolveRefetchInterval(undefined, null)).toBe(false);
  });

  it("returns false when both are null", () => {
    expect(resolveRefetchInterval(null, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- resolve-refetch-interval`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `src/hooks/resolve-refetch-interval.ts`:

```ts
import type { RefreshIntervalMs } from "@/contexts/RefreshIntervalContext";

export function resolveRefetchInterval(
  explicit: number | null | undefined,
  ctx: RefreshIntervalMs,
): number | false {
  const effective = explicit !== undefined ? explicit : ctx;
  return effective ?? false;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- resolve-refetch-interval`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/resolve-refetch-interval.ts tests/unit/resolve-refetch-interval.test.ts
git commit -m "feat(hooks): add resolveRefetchInterval helper"
```

---

## Task 3: Wire context + helper into `useQueryRange`

**Files:**
- Modify: `src/hooks/useQueryRange.ts`

- [ ] **Step 1: Replace the file contents**

Replace `src/hooks/useQueryRange.ts` with:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { PromRangeResponse } from "@/server/schemas/prometheus";
import { useRefreshInterval } from "@/contexts/RefreshIntervalContext";
import { resolveRefetchInterval } from "@/hooks/resolve-refetch-interval";

export interface QueryRangeOptions {
  start?: number;           // unix seconds
  end?: number;
  step?: number;            // seconds
  refetchIntervalMs?: number | null;
}

async function fetchRange(
  expr: string,
  opts: QueryRangeOptions,
): Promise<PromRangeResponse> {
  const r = await fetch("/api/promql/query_range", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      expr,
      start: opts.start,
      end: opts.end,
      step: opts.step,
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PromQL query_range failed: ${r.status} ${text}`);
  }
  return (await r.json()) as PromRangeResponse;
}

export function useQueryRange(expr: string, opts: QueryRangeOptions = {}) {
  const ctx = useRefreshInterval();
  const refetchInterval = resolveRefetchInterval(opts.refetchIntervalMs, ctx);
  return useQuery({
    queryKey: ["promql-range", expr, opts.start, opts.end, opts.step],
    queryFn: () => fetchRange(expr, opts),
    refetchInterval,
    enabled: expr.trim().length > 0,
  });
}
```

Notes:
- `refetchIntervalMs` option type widened to `number | null` so callers can say
  "off" explicitly.
- The previous hardcoded `15_000` default is gone; callers that want a fixed
  interval must pass it.

- [ ] **Step 2: Run existing tests**

Run: `pnpm test`
Expected: PASS (all existing widget tests still green; none assert on refetch
cadence).

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useQueryRange.ts
git commit -m "feat(hooks): useQueryRange reads refresh interval from context"
```

---

## Task 4: Wire context + helper into `useQueryInstant`

**Files:**
- Modify: `src/hooks/useQueryInstant.ts`

- [ ] **Step 1: Replace the file contents**

Replace `src/hooks/useQueryInstant.ts` with:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { PromInstantResponse } from "@/server/schemas/prometheus";
import { useRefreshInterval } from "@/contexts/RefreshIntervalContext";
import { resolveRefetchInterval } from "@/hooks/resolve-refetch-interval";

export interface QueryInstantOptions {
  time?: number;
  refetchIntervalMs?: number | null;
}

async function fetchInstant(
  expr: string,
  opts: QueryInstantOptions,
): Promise<PromInstantResponse> {
  const r = await fetch("/api/promql/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ expr, time: opts.time }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PromQL query failed: ${r.status} ${text}`);
  }
  return (await r.json()) as PromInstantResponse;
}

export function useQueryInstant(expr: string, opts: QueryInstantOptions = {}) {
  const ctx = useRefreshInterval();
  const refetchInterval = resolveRefetchInterval(opts.refetchIntervalMs, ctx);
  return useQuery({
    queryKey: ["promql-instant", expr, opts.time],
    queryFn: () => fetchInstant(expr, opts),
    refetchInterval,
    enabled: expr.trim().length > 0,
  });
}
```

- [ ] **Step 2: Run existing tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useQueryInstant.ts
git commit -m "feat(hooks): useQueryInstant reads refresh interval from context"
```

---

## Task 5: Preserve prometheus-demo behaviour

**Why:** The demo page previously relied on the hook's implicit 15 s default.
After Tasks 3–4, no provider is mounted on that page, so queries would become
one-shot. Pass the interval explicitly to keep current UX.

**Files:**
- Modify: `app/prometheus-demo/page.tsx`

- [ ] **Step 1: Update the `useQueryRange` call**

In `app/prometheus-demo/page.tsx`, change line 17 from:

```tsx
  const { data, isLoading, error } = useQueryRange(DEMO_EXPR);
```

to:

```tsx
  const { data, isLoading, error } = useQueryRange(DEMO_EXPR, {
    refetchIntervalMs: 15_000,
  });
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/prometheus-demo/page.tsx
git commit -m "fix(demo): pass 15s refetch interval explicitly after hook default removed"
```

---

## Task 6: `RefreshIntervalSelect` component

**Files:**
- Create: `src/components/RefreshIntervalSelect.tsx`
- Test: `tests/unit/RefreshIntervalSelect.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/unit/RefreshIntervalSelect.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RefreshIntervalSelect } from "@/components/RefreshIntervalSelect";

describe("RefreshIntervalSelect", () => {
  it("renders all six options in the expected order", () => {
    render(<RefreshIntervalSelect value={null} onChange={() => {}} />);
    const labels = Array.from(
      screen.getByRole("combobox").querySelectorAll("option"),
    ).map((o) => o.textContent);
    expect(labels).toEqual(["Off", "5s", "30s", "1m", "5m", "15m"]);
  });

  it("shows the current value as selected ('Off' when null)", () => {
    render(<RefreshIntervalSelect value={null} onChange={() => {}} />);
    expect(
      (screen.getByRole("combobox") as HTMLSelectElement).value,
    ).toBe("off");
  });

  it("shows the current value as selected (30s when value=30000)", () => {
    render(<RefreshIntervalSelect value={30_000} onChange={() => {}} />);
    expect(
      (screen.getByRole("combobox") as HTMLSelectElement).value,
    ).toBe("30000");
  });

  it("emits a number when a numeric option is picked", () => {
    const onChange = vi.fn();
    render(<RefreshIntervalSelect value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "5000" },
    });
    expect(onChange).toHaveBeenCalledWith(5_000);
  });

  it("emits null when 'Off' is picked", () => {
    const onChange = vi.fn();
    render(<RefreshIntervalSelect value={5_000} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "off" },
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("has an accessible label", () => {
    render(<RefreshIntervalSelect value={null} onChange={() => {}} />);
    expect(screen.getByLabelText(/refresh/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- RefreshIntervalSelect`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/RefreshIntervalSelect.tsx`:

```tsx
"use client";

import type { RefreshIntervalMs } from "@/contexts/RefreshIntervalContext";

interface Option {
  label: string;
  value: RefreshIntervalMs;
}

const OPTIONS: readonly Option[] = [
  { label: "Off", value: null },
  { label: "5s", value: 5_000 },
  { label: "30s", value: 30_000 },
  { label: "1m", value: 60_000 },
  { label: "5m", value: 300_000 },
  { label: "15m", value: 900_000 },
];

function toSelectValue(v: RefreshIntervalMs): string {
  return v === null ? "off" : String(v);
}

function fromSelectValue(s: string): RefreshIntervalMs {
  return s === "off" ? null : Number(s);
}

interface Props {
  value: RefreshIntervalMs;
  onChange: (v: RefreshIntervalMs) => void;
}

export function RefreshIntervalSelect({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Refresh</span>
      <select
        aria-label="Refresh interval"
        className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
        value={toSelectValue(value)}
        onChange={(e) => onChange(fromSelectValue(e.target.value))}
      >
        {OPTIONS.map((o) => (
          <option key={toSelectValue(o.value)} value={toSelectValue(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- RefreshIntervalSelect`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RefreshIntervalSelect.tsx tests/unit/RefreshIntervalSelect.test.tsx
git commit -m "feat(ui): add RefreshIntervalSelect component"
```

---

## Task 7: Integrate into the dashboard view page

**Files:**
- Modify: `app/dashboards/[id]/page.tsx`

- [ ] **Step 1: Replace the file contents**

Replace `app/dashboards/[id]/page.tsx` with:

```tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardCanvas } from "@/components/DashboardCanvas";
import { RefreshIntervalSelect } from "@/components/RefreshIntervalSelect";
import {
  RefreshIntervalProvider,
  type RefreshIntervalMs,
} from "@/contexts/RefreshIntervalContext";
import { useDashboard } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/button";

export default function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useDashboard(id);
  const [refreshIntervalMs, setRefreshIntervalMs] =
    useState<RefreshIntervalMs>(null);

  return (
    <AppShell>
      {isLoading && <p className="text-muted-foreground">Loading dashboard…</p>}
      {error && (
        <p className="text-red-400">Failed to load dashboard: {error.message}</p>
      )}
      {data && (
        <>
          <header className="mb-6 flex items-baseline justify-between">
            <h1 className="text-2xl font-semibold">{data.name}</h1>
            <div className="flex items-center gap-4">
              <RefreshIntervalSelect
                value={refreshIntervalMs}
                onChange={setRefreshIntervalMs}
              />
              <Link href={`/dashboards/${id}/edit`}>
                <Button size="sm">Edit</Button>
              </Link>
            </div>
          </header>
          <RefreshIntervalProvider value={refreshIntervalMs}>
            <DashboardCanvas
              width={data.width}
              height={data.height}
              widgets={data.widgets}
            />
          </RefreshIntervalProvider>
        </>
      )}
    </AppShell>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Run the full unit suite**

Run: `pnpm test`
Expected: PASS (everything green).

- [ ] **Step 4: Manual sanity check**

Start the dev server (`pnpm dev`), open a dashboard in the browser, and
confirm:

1. The dropdown appears in the header, to the left of the Edit button.
2. Default selection is "Off".
3. Selecting an interval causes the widgets to refetch (watch the Network
   panel for repeat `/api/promql/*` calls at the chosen cadence).
4. Selecting "Off" again stops further refetches.

- [ ] **Step 5: Commit**

```bash
git add app/dashboards/[id]/page.tsx
git commit -m "feat(dashboard): add auto-refresh dropdown to view page"
```

---

## Task 8: E2E test for auto-refresh

**Files:**
- Create: `tests/e2e/dashboard-auto-refresh.spec.ts`

**Why:** Unit tests cover the resolver and the component in isolation. This
test exercises the full chain — dropdown → context → hook → actual HTTP
requests — in a real browser.

- [ ] **Step 1: Write the spec**

Create `tests/e2e/dashboard-auto-refresh.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("auto-refresh dropdown controls widget refetching", async ({ page }) => {
  // Count requests to the PromQL endpoints. We only care about how many
  // times widgets refetch after the initial load.
  let promqlRequests = 0;
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/promql/query")) promqlRequests += 1;
  });

  await page.goto("/");
  const card = page
    .getByRole("main")
    .getByRole("link", { name: "Infrastructure Overview" });
  await card.click();
  await expect(
    page.getByRole("heading", { name: "Infrastructure Overview" }),
  ).toBeVisible({ timeout: 15_000 });

  const select = page.getByLabel("Refresh interval");
  await expect(select).toBeVisible();
  await expect(select).toHaveValue("off");

  // Wait for the page to settle, then take a baseline.
  await page.waitForTimeout(2_000);
  const baseline = promqlRequests;

  // 6 seconds with "Off" must not introduce additional requests.
  await page.waitForTimeout(6_000);
  expect(promqlRequests).toBe(baseline);

  // Switch to 5 s and expect at least one more PromQL request within ~8 s.
  await select.selectOption("5000");
  await page.waitForTimeout(8_000);
  expect(promqlRequests).toBeGreaterThan(baseline);

  // Switch back to Off and verify the request count stops climbing.
  const afterOn = promqlRequests;
  await select.selectOption("off");
  await page.waitForTimeout(7_000);
  expect(promqlRequests).toBe(afterOn);
});
```

Notes for the implementer:
- The seed dashboard "Infrastructure Overview" is used because the existing
  `dashboard-smoke.spec.ts` already relies on it being present.
- The seed widgets ship without PromQL queries attached, so `enabled` on the
  React Query hooks is `false` and no requests fire. **Before running this
  test**, attach any PromQL expression (e.g. `up`) to at least one widget on
  the seed dashboard so requests actually happen. If doing so via the UI is
  too slow, update the seed script to ship one widget with `query.expr` set,
  or use the existing edit-persist flow to save a query before the test.
  Document whichever approach is chosen in the test file's header comment.

- [ ] **Step 2: Prepare the seed so the test has a query to refetch**

Pick ONE of the following and apply it:

1. **Seed update (preferred):** in `scripts/seed.ts`, give one widget on the
   Infrastructure Overview dashboard `query: { expr: "up" }`. Re-run
   `pnpm db:seed`.
2. **Test-local setup:** have the spec navigate to the dashboard's edit page,
   attach `up` to a widget, save, then navigate back. Slower but keeps the
   seed unchanged.

Whichever you pick, leave a one-line comment at the top of the spec noting
the choice.

- [ ] **Step 3: Run the e2e test**

Run: `pnpm e2e -- dashboard-auto-refresh`
Expected: PASS. If flaky, widen the 8 s window to 10 s — a 5 s interval plus
one network round trip should comfortably complete within 10 s on a local
machine.

- [ ] **Step 4: Run the full e2e suite to confirm no regressions**

Run: `pnpm e2e`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/dashboard-auto-refresh.spec.ts
# plus scripts/seed.ts if you changed it
git commit -m "test(e2e): cover auto-refresh dropdown behaviour"
```

---

## Final verification

- [ ] `pnpm typecheck` — PASS
- [ ] `pnpm lint` — PASS
- [ ] `pnpm test` — PASS (all unit tests, including the three new suites)
- [ ] `pnpm e2e` — PASS (including the new `dashboard-auto-refresh.spec.ts`)
- [ ] Manual: open a dashboard, confirm dropdown default is Off, confirm
  selecting 5 s triggers visible network refetches, confirm selecting Off
  stops them.

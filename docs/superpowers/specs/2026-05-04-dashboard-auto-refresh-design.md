# Dashboard Auto-Refresh Dropdown — Design

Date: 2026-05-04

## Goal

Add a user-selectable auto-refresh interval to the dashboard **view** page
(`/dashboards/[id]`). The user picks an interval from a dropdown and every
widget on the dashboard refetches its data at that cadence.

## Scope

- Dropdown appears **only on the view page header**, next to the Edit button.
- Options: **Off**, **5s**, **30s**, **1m**, **5m**, **15m**.
- Default: **Off**.
- State is **session-only**: no localStorage, no DB persistence, no carry-over
  between page loads or navigations.
- No manual "refresh now" button — dropdown only.
- Edit page, dashboards list, and other pages are unchanged.

## Non-goals

- Persisting the selection.
- Per-widget refresh override.
- Pause-on-tab-hidden behaviour beyond what React Query already provides.

## Approach

**React Context** owned by the view page.

The view page holds the selected interval in local state (`number | null`,
where `null` means Off). It wraps its `DashboardCanvas` in a
`RefreshIntervalProvider` that exposes this value. The existing query hooks
(`useQueryRange`, `useQueryInstant`) read the context when the caller does not
pass an explicit `refetchIntervalMs`. Widget components need no changes.

This was chosen over a Zustand store (overkill for page-local state) and prop
drilling (touches every widget file).

## Components

### 1. `src/contexts/RefreshIntervalContext.tsx` (new)

```ts
type RefreshIntervalMs = number | null; // null = off
```

Exports:

- `RefreshIntervalProvider` — takes `value: RefreshIntervalMs` and children.
- `useRefreshInterval(): RefreshIntervalMs` — returns `null` when no provider
  is mounted (the context default).

### 2. `src/components/RefreshIntervalSelect.tsx` (new)

Controlled native `<select>` (consistent with the current minimal
`components/ui` set — only `button` and `card` exist; no Select primitive).

Props: `value: RefreshIntervalMs`, `onChange: (v: RefreshIntervalMs) => void`.

Options (label → value in ms):

| Label | Value      |
| ----- | ---------- |
| Off   | `null`     |
| 5s    | `5_000`    |
| 30s   | `30_000`   |
| 1m    | `60_000`   |
| 5m    | `300_000`  |
| 15m   | `900_000`  |

The `<option>` value attribute is a string; the component converts to
`number | null` on change.

### 3. `app/dashboards/[id]/page.tsx` (edit)

- Add `const [intervalMs, setIntervalMs] = useState<RefreshIntervalMs>(null);`
- Render `<RefreshIntervalSelect value={intervalMs} onChange={setIntervalMs} />`
  in the header, placed before the Edit link.
- Wrap `<DashboardCanvas ... />` in `<RefreshIntervalProvider value={intervalMs}>`.

### 4. `src/hooks/useQueryRange.ts` and `src/hooks/useQueryInstant.ts` (edit)

- Import `useRefreshInterval`.
- Behaviour for `refetchInterval` passed to React Query:
  1. If the caller passed `opts.refetchIntervalMs` explicitly (any value
     including 0 or `null`), use it — `null` → `false`, number → number.
  2. Otherwise fall back to the context value — `null` → `false`, number →
     number.
- Remove the current hardcoded `15_000` default.

Pseudocode:

```ts
const ctx = useRefreshInterval();
const effective =
  opts.refetchIntervalMs !== undefined ? opts.refetchIntervalMs : ctx;
const refetchInterval = effective ?? false;
```

To support step 1 unambiguously, widen `refetchIntervalMs` option type to
`number | null | undefined`.

### 5. Callers outside the dashboard view

`app/prometheus-demo/page.tsx` uses `useQueryRange` / `useQueryInstant`
directly. Under the new behaviour, without a provider, context returns `null`,
so queries would **not** auto-refetch. To preserve today's 15s cadence on that
page, pass `refetchIntervalMs: 15_000` explicitly from the demo page.

## Data flow

```
Page state ──► RefreshIntervalProvider ──► useQueryRange / useQueryInstant
    ▲                                                │
    │                                                ▼
RefreshIntervalSelect (onChange)            React Query refetchInterval
```

Changing the dropdown re-renders the provider; React Query picks up the new
`refetchInterval` for each widget on its next render cycle. No per-widget
wiring, no manual invalidation.

## Testing

Unit (vitest):

- `RefreshIntervalSelect` renders exactly the six options in order; emits the
  correct `number | null` value via `onChange` for each selection.
- `useQueryRange` / `useQueryInstant`:
  - Explicit `refetchIntervalMs` beats the context value.
  - With no explicit option and context `null`, React Query receives
    `refetchInterval: false`.
  - With no explicit option and context `30_000`, React Query receives
    `refetchInterval: 30_000`.

E2E (Playwright, matching the existing specs' style):

- Open a dashboard with at least one widget. Dropdown defaults to Off.
  Observe network: no repeat `/api/promql/*` calls after initial load over
  a short wait window.
- Select 5s. Assert at least one additional `/api/promql/*` request fires
  within ~7s of selection.
- Select Off again. Assert no further `/api/promql/*` requests fire after
  the next expected tick elapses.

## Risks

- Removing the hardcoded 15s default changes behaviour anywhere the hooks are
  used without an explicit interval and without a provider. Mitigation:
  update `app/prometheus-demo/page.tsx` to pass `15_000` explicitly in the
  same change.
- Very short intervals (5s) combined with many widgets may be heavy on the
  Prometheus backend; accepted as a user choice — this is an operator tool.

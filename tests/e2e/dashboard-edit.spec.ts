// NOTE: Asserts the save round-trip succeeds (no error banner, URL returns
// to /dashboards/<uuid>) on the seeded dashboard. Postgres assigns a v4
// UUID to the seed row, so we look it up via the API before driving the UI.

import { test, expect } from "@playwright/test";

test.afterEach(async ({ request }) => {
  // Restore the seeded dashboard's name + widget layout so sibling specs
  // (e.g. smoke) that assert on "Infrastructure Overview" remain stable.
  // Only targets the dashboard this test renamed to "Renamed by E2E" —
  // skip if absent to avoid mutating unrelated rows on failed runs.
  try {
    const list = await request.get("/api/dashboards");
    const rows = (await list.json()) as Array<{ id: string; name: string }>;
    const renamed = rows.find((r) => r.name === "Renamed by E2E");
    if (!renamed) return;
    await request.put(`/api/dashboards/${renamed.id}`, {
      data: {
        name: "Infrastructure Overview",
        widgets: [
          { id: "w-cpu-kpi",     kind: "kpi",   title: "CPU %",          x:  20, y:  20, w:  260, h: 160 },
          { id: "w-cpu-line",    kind: "line",  title: "CPU over time",  x: 300, y:  20, w:  720, h: 320 },
          { id: "w-hosts-table", kind: "table", title: "Hosts",          x:  20, y: 360, w: 1000, h: 320 },
        ],
      },
    });
  } catch {
    // Best-effort cleanup; don't fail the test on restore errors.
  }
});

test("edits a dashboard: drag a canvas widget, save, round-trip without error", async ({ page, request }) => {
  const list = await request.get("/api/dashboards");
  const rows = (await list.json()) as Array<{ id: string; name: string }>;
  const seed = rows.find((r) => r.name === "Infrastructure Overview");
  if (!seed) throw new Error("Seed dashboard 'Infrastructure Overview' not found");
  const id = seed.id;

  await page.goto(`/dashboards/${id}`);
  await expect(
    page.getByRole("heading", { name: "Infrastructure Overview" }),
  ).toBeVisible({ timeout: 15_000 });

  // Enter edit mode
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboards/${id}/edit$`));
  await expect(page.getByText(/no changes/)).toBeVisible({ timeout: 15_000 });

  // Rename the dashboard inline via the toolbar's name input. The input is
  // aria-label="Dashboard name" (from EditToolbar's onTitleChange branch).
  const nameInput = page.getByRole("textbox", { name: "Dashboard name" });
  await expect(nameInput).toHaveValue("Infrastructure Overview");
  await nameInput.fill("Renamed by E2E");
  await expect(page.getByText(/unsaved changes/)).toBeVisible({ timeout: 5_000 });

  // The CPU KPI tile lives inside a react-rnd wrapper (the ancestor div with
  // inline style positioning). Our own inner div carries data-widget-id.
  // Try the left/top positioned ancestor first; fall back to transform
  // positioning if that fails.
  const cpuInner = page.locator('[data-widget-id="w-cpu-kpi"]');
  await expect(cpuInner).toBeVisible({ timeout: 15_000 });

  let cpuTile = cpuInner.locator(
    'xpath=ancestor::div[contains(@style,"left") and contains(@style,"top")][1]',
  );
  if ((await cpuTile.count()) === 0) {
    cpuTile = cpuInner.locator(
      'xpath=ancestor::div[contains(@style,"transform")][1]',
    );
  }
  await expect(cpuTile).toBeVisible({ timeout: 15_000 });

  const box = await cpuTile.boundingBox();
  if (!box) throw new Error("CPU tile has no bounding box");

  // Drag the tile ~200 px right, ~150 px down. Fixture places it at (20, 20),
  // so it ends up around (220, 170) in canvas space. Start the drag well
  // below the title bar — P2.3's WidgetFrame puts an inline-rename input at
  // the top of every widget, and react-rnd's `cancel=".widget-remove-button,
  // input"` blocks drags that start inside the title input.
  await page.mouse.move(box.x + 80, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 280, box.y + 230, { steps: 10 });
  await page.mouse.up();

  await expect(page.getByText(/unsaved changes/)).toBeVisible({ timeout: 5_000 });

  // Select the line widget (w-cpu-line) and attach a PromQL query.
  await page.locator('[data-widget-id="w-cpu-line"]').click();

  const exprInput = page.getByRole("textbox", { name: "PromQL expression" });
  await expect(exprInput).toBeVisible({ timeout: 5_000 });
  await exprInput.fill("scrape_duration_seconds");
  await page.getByRole("button", { name: "Apply" }).click();

  // The widget's "No query" placeholder should not appear on the line tile
  // (scoped — the KPI and Hosts Table still lack queries at this point and
  // their own placeholders remain visible).
  await expect(
    page
      .locator('[data-widget-id="w-cpu-line"]')
      .getByText(/No query —/),
  ).not.toBeVisible();

  // Deselect and then select the KPI widget; attach a PromQL query to it too.
  await page.getByRole("button", { name: "← Widgets" }).click();
  await page.locator('[data-widget-id="w-cpu-kpi"]').click({ force: true });

  const kpiExpr = page.getByRole("textbox", { name: "PromQL expression" });
  await expect(kpiExpr).toBeVisible({ timeout: 5_000 });
  await kpiExpr.fill("up");
  await page.getByRole("button", { name: "Apply" }).click();

  // KPI renders either a number or "No samples." — either proves the PromKpi
  // branch took over. The placeholder should be gone from the KPI tile.
  await expect(
    page
      .locator('[data-widget-id="w-cpu-kpi"]')
      .getByText(/No query —/),
  ).not.toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: /^Save/ }).click();

  await expect(page).toHaveURL(new RegExp(`/dashboards/${id}$`), { timeout: 15_000 });
  // Postgres persists the rename, so the post-save heading reflects the
  // new name rather than the seeded one.
  await expect(
    page.getByRole("heading", { name: "Renamed by E2E" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Failed to load/)).not.toBeVisible();
});

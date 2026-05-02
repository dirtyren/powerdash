// NOTE: Because the WireMock `/dashboards/1.xml` mapping serves a static
// fixture, reloading after save will show the ORIGINAL widget positions,
// not the dragged ones. This test asserts the save round-trip succeeds
// (no error banner, URL returns to /dashboards/1) without asserting
// cross-session persistence. A richer persistence check would require
// a WireMock scenario state machine — deferred to a later plan.

import { test, expect } from "@playwright/test";

test("edits a dashboard: drag a canvas widget, save, round-trip without error", async ({ page }) => {
  await page.goto("/dashboards/1");
  await expect(
    page.getByRole("heading", { name: "Infrastructure Overview" }),
  ).toBeVisible({ timeout: 15_000 });

  // Enter edit mode
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/dashboards\/1\/edit$/);
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

  // The widget's "No query" placeholder should not appear (SeriesChart now
  // has a non-empty expr so it either renders or shows loading/no samples).
  await expect(page.getByText(/No query —/)).not.toBeVisible();

  // Deselect and then select the KPI widget; attach a PromQL query to it too.
  await page.getByRole("button", { name: "← Widgets" }).click();
  await page.locator('[data-widget-id="w-cpu-kpi"]').click({ force: true });

  const kpiExpr = page.getByRole("textbox", { name: "PromQL expression" });
  await expect(kpiExpr).toBeVisible({ timeout: 5_000 });
  await kpiExpr.fill("up");
  await page.getByRole("button", { name: "Apply" }).click();

  // KPI renders either a number or "No samples." — either proves the PromKpi
  // branch took over. The "No query" placeholder must not be visible.
  await expect(page.getByText(/No query —/)).not.toBeVisible();

  await page.getByRole("button", { name: /^Save/ }).click();

  await expect(page).toHaveURL(/\/dashboards\/1$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Infrastructure Overview" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Failed to load/)).not.toBeVisible();
});

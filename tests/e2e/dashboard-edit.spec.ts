// NOTE: Because the WireMock `/dashboards/1.xml` mapping serves a static
// fixture, reloading after save will show the ORIGINAL widget positions,
// not the dragged ones. This test asserts the save round-trip succeeds
// (no error banner, URL returns to /dashboards/1) without asserting
// cross-session persistence. A richer persistence check would require
// a WireMock scenario state machine — deferred to a later plan.

import { test, expect } from "@playwright/test";

test("edits a dashboard: drag, save, round-trip without error", async ({ page }) => {
  await page.goto("/dashboards/1");
  await expect(
    page.getByRole("heading", { name: "Infrastructure Overview" }),
  ).toBeVisible({ timeout: 15_000 });

  // Enter edit mode
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/dashboards\/1\/edit$/);
  await expect(page.getByText(/no changes/)).toBeVisible({ timeout: 15_000 });

  // Find the react-grid-layout container and the CPU KPI tile
  const grid = page.locator(".react-grid-layout");
  await expect(grid).toBeVisible({ timeout: 15_000 });

  const cpuTile = page.locator('.react-grid-item[data-widget-id="w-cpu-kpi"]');
  await expect(cpuTile).toBeVisible({ timeout: 15_000 });

  const box = await cpuTile.boundingBox();
  if (!box) throw new Error("CPU tile has no bounding box");

  // Drag the tile ~400px right and ~300px down
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 420, box.y + 320, { steps: 10 });
  await page.mouse.up();

  // Dirty indicator should appear
  await expect(page.getByText(/unsaved changes/)).toBeVisible({ timeout: 5_000 });

  // Save
  await page.getByRole("button", { name: /^Save/ }).click();

  // Land on view route
  await expect(page).toHaveURL(/\/dashboards\/1$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Infrastructure Overview" }),
  ).toBeVisible();

  // Sanity: reload, no error banner
  await page.reload();
  await expect(page.getByText(/Failed to load/)).not.toBeVisible();
});

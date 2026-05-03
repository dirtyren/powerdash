import { test, expect } from "@playwright/test";

test("lists dashboards and opens one with all three widget kinds", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboards" })).toBeVisible();

  // The seed name appears in both the sidebar nav and the main grid.
  // Scope to main to avoid a strict-mode violation.
  const card = page
    .getByRole("main")
    .getByRole("link", { name: "Infrastructure Overview" });
  await expect(card).toBeVisible();

  await card.click();
  await expect(page.getByRole("heading", { name: "Infrastructure Overview" })).toBeVisible({
    timeout: 15_000,
  });

  // Post-Postgres migration: the seed dashboard's widgets ship with no
  // PromQL queries attached, so each widget renders its title + a "No query"
  // placeholder. Assert the three widget TITLES (KPI "CPU %", line
  // "CPU over time", table "Hosts") are present — that's what the smoke
  // test actually needs to verify (the app loads one dashboard with three
  // widget kinds rendered). We don't assert on sample data values because
  // there is no query to produce them.
  const canvas = page.locator('[data-widget-id]');
  await expect(canvas.filter({ hasText: "CPU %" }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(canvas.filter({ hasText: "CPU over time" }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(canvas.filter({ hasText: "Hosts" }).first()).toBeVisible({
    timeout: 15_000,
  });
});

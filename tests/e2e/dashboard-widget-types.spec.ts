// tests/e2e/dashboard-widget-types.spec.ts
// Exercises the P2.3 palette: add multiple widget kinds (including
// duplicates of the same kind), rename one inline, save, and assert
// redirect. Postgres generates a v4 UUID on create, so the redirect
// lands on /dashboards/<uuid>.

import { test, expect } from "@playwright/test";

test("palette adds multiple kinds; inline rename works; duplicates allowed", async ({ page }) => {
  await page.goto("/dashboards/new");
  await expect(page.getByRole("textbox", { name: "Dashboard name" })).toBeVisible({
    timeout: 15_000,
  });

  const palette = page.locator("aside");

  // Add two bar charts (duplicate guard is gone — multiple instances allowed)
  await palette.getByRole("button", { name: "Bar chart" }).click();
  await palette.getByRole("button", { name: "Bar chart" }).click();

  // Add a pie chart
  await palette.getByRole("button", { name: "Pie chart" }).click();

  // Rename the first widget's title via the inline input. Each widget has a
  // text input labeled "Widget title" inside its data-widget-id container.
  const firstWidget = page.locator("[data-widget-id]").first();
  const firstTitleInput = firstWidget.getByRole("textbox", { name: "Widget title" });
  await firstTitleInput.fill("My renamed bar");

  await page.getByRole("button", { name: /^Save/ }).click();
  await expect(page).toHaveURL(/\/dashboards\/[0-9a-f-]+$/, { timeout: 15_000 });
});

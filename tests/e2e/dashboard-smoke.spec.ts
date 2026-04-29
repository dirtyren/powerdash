import { test, expect } from "@playwright/test";

test("lists dashboards and opens one with all three widget kinds", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboards" })).toBeVisible();
  await expect(page.getByText("Infrastructure Overview")).toBeVisible();

  await page.getByText("Infrastructure Overview").click();
  await expect(page.getByRole("heading", { name: "Infrastructure Overview" })).toBeVisible({
    timeout: 15_000,
  });

  // KPI
  await expect(page.getByText(/42\.3/)).toBeVisible({ timeout: 15_000 });
  // Line chart — echarts canvas
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15_000 });
  // Table row
  await expect(page.getByText("db-01")).toBeVisible({ timeout: 15_000 });
});

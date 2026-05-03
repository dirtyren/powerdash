// tests/e2e/dashboard-create.spec.ts
// Creates a new dashboard from the home page, adds a widget from the P2.3
// palette, saves, and asserts redirect. The stateful mock-api allocates a
// fresh sequential id on create, so the redirect lands on /dashboards/<n>
// where n >= 2. Round-trip persistence of layout is not asserted.

import { test, expect } from "@playwright/test";

test("creates a new dashboard from the catalog palette", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboards" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("link", { name: "New Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboards\/new$/);

  const titleInput = page.getByRole("textbox", { name: "Dashboard name" });
  await expect(titleInput).toHaveValue("Untitled dashboard");
  await titleInput.fill("E2E created");

  const saveBtn = page.getByRole("button", { name: /^Save/ });
  await expect(saveBtn).toBeDisabled();

  // Add a KPI widget from the palette (scoped to the palette aside to avoid
  // matching any button that may share the text elsewhere on the page)
  await page.locator("aside").getByRole("button", { name: "KPI" }).click();

  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  await expect(page).toHaveURL(/\/dashboards\/\d+$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "E2E created" }),
  ).toBeVisible({ timeout: 15_000 });
});

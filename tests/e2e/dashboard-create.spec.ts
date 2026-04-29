// Creates a new dashboard from the home page, adds one widget, names it,
// saves, and asserts redirect. WireMock's existing save mapping returns
// {output: 1} on any POST, so the redirect lands on /dashboards/1 — which
// has a canonical static fixture. Round-trip persistence is not asserted
// (same trade-off as dashboard-edit.spec.ts).

import { test, expect } from "@playwright/test";

test("creates a new dashboard from the catalog palette", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboards" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("link", { name: "New Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboards\/new$/, { timeout: 15_000 });

  const titleInput = page.getByRole("textbox", { name: "Dashboard name" });
  await expect(titleInput).toHaveValue("Untitled dashboard");
  await titleInput.fill("E2E created");

  // Save should still be disabled — no widgets yet
  const saveBtn = page.getByRole("button", { name: /^Save/ });
  await expect(saveBtn).toBeDisabled();

  // Add a widget from the palette
  await page.locator("aside").getByRole("button", { name: /CPU %/ }).click();

  // That palette entry should now be disabled (duplicate guard)
  await expect(
    page.locator("aside").getByRole("button", { name: /CPU %/ }),
  ).toBeDisabled();

  // Save becomes enabled
  await expect(saveBtn).toBeEnabled();

  await saveBtn.click();

  // WireMock returns output: 1, so redirect lands on /dashboards/1
  await expect(page).toHaveURL(/\/dashboards\/1$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Infrastructure Overview" }),
  ).toBeVisible({ timeout: 15_000 });
});

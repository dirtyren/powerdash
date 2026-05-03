import { test, expect } from "@playwright/test";

test("widget edits persist across refresh", async ({ page }) => {
  await page.goto("/dashboards/1/edit");

  const name = page.getByRole("textbox", { name: "Dashboard name" });
  await expect(name).toBeVisible();

  const uniqueName = `Edited ${Date.now()}`;
  await name.fill(uniqueName);

  const saveResponse = page.waitForResponse(
    (r) => r.url().includes("/api/dashboards/1") && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Save" }).click();
  await saveResponse;

  await page.waitForURL("/dashboards/1");
  await page.reload();

  await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible();
});

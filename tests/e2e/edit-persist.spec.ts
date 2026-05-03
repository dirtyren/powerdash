import { test, expect } from "@playwright/test";

test("widget edits persist across refresh", async ({ page, request }) => {
  // Resolve the seed dashboard's UUID via the API (Postgres-assigned).
  const list = await request.get("/api/dashboards");
  const rows = (await list.json()) as Array<{ id: string; name: string }>;
  const first = rows[0];
  if (!first) throw new Error("No dashboards seeded");
  const id = first.id;

  await page.goto(`/dashboards/${id}/edit`);

  const name = page.getByRole("textbox", { name: "Dashboard name" });
  await expect(name).toBeVisible();

  const uniqueName = `Edited ${Date.now()}`;
  await name.fill(uniqueName);

  const saveResponse = page.waitForResponse(
    (r) => r.url().includes(`/api/dashboards/${id}`) && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Save" }).click();
  await saveResponse;

  await page.waitForURL(`/dashboards/${id}`);
  await page.reload();

  await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible();
});

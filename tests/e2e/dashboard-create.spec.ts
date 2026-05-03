// tests/e2e/dashboard-create.spec.ts
// Creates a new dashboard from the home page, adds a widget from the P2.3
// palette, saves, and asserts redirect. Postgres generates a v4 UUID on
// create, so the redirect lands on /dashboards/<uuid>. Round-trip
// persistence of layout is not asserted.

import { test, expect } from "@playwright/test";

test("creates a new dashboard from the catalog palette", async ({ page }) => {
  // Cold-start readiness: on a fresh `docker compose up`, Next.js may serve
  // the HTML shell before the client bundle has hydrated. A click on the
  // Next.js <Link> will dispatch an onClick that preventDefault()s the
  // native anchor navigation AND tries to call router.push — if the router
  // isn't wired yet the link clicks silently do nothing. Gate on the list
  // API response AND on the seeded dashboard link being visible in the
  // main grid (that card is rendered from data returned by useDashboards,
  // so its presence means React has hydrated and wired event handlers).
  const listResponse = page.waitForResponse(
    (r) => r.url().includes("/api/dashboards") && r.status() === 200,
    { timeout: 30_000 },
  );
  await page.goto("/");
  await listResponse;
  await expect(page.getByRole("heading", { name: "Dashboards" })).toBeVisible({
    timeout: 20_000,
  });
  // The Infrastructure Overview card in <main> mounts only after useDashboards
  // resolves AND hydration has attached event handlers. Belt-and-braces
  // readiness check before clicking any Next.js Link.
  await expect(
    page.getByRole("main").getByRole("link", { name: "Infrastructure Overview" }),
  ).toBeVisible({ timeout: 20_000 });

  await page.getByRole("link", { name: "New Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboards\/new$/, { timeout: 15_000 });

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

  await expect(page).toHaveURL(/\/dashboards\/[0-9a-f-]+$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "E2E created" }),
  ).toBeVisible({ timeout: 15_000 });
});

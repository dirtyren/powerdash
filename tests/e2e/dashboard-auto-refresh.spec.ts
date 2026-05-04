// Requires the "Infrastructure Overview" seed dashboard to have at least one
// widget with a PromQL query attached (the seed script gives `w-cpu-kpi` the
// `up` expression). Without it, the widgets are `enabled: false` and no
// /api/promql requests fire — the test would have nothing to count.
import { test, expect } from "@playwright/test";

test("auto-refresh dropdown controls widget refetching", async ({ page }) => {
  let promqlRequests = 0;
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/promql/query")) promqlRequests += 1;
  });

  await page.goto("/");
  const card = page
    .getByRole("main")
    .getByRole("link", { name: "Infrastructure Overview" });
  await card.click();
  await expect(
    page.getByRole("heading", { name: "Infrastructure Overview" }),
  ).toBeVisible({ timeout: 15_000 });

  const select = page.getByLabel("Refresh interval");
  await expect(select).toBeVisible();
  await expect(select).toHaveValue("off");

  // Settle, then take a baseline.
  await page.waitForTimeout(2_000);
  const baseline = promqlRequests;

  // 6 seconds with "Off" must not introduce additional requests.
  await page.waitForTimeout(6_000);
  expect(promqlRequests).toBeLessThanOrEqual(baseline);

  // Switch to 5s and expect at least one more PromQL request within ~8s.
  await select.selectOption("5000");
  await page.waitForTimeout(8_000);
  expect(promqlRequests).toBeGreaterThan(baseline);

  // Switch back to Off; request count should stop climbing, allowing for
  // one in-flight fetch that was already pending when the user toggled.
  const afterOn = promqlRequests;
  await select.selectOption("off");
  await page.waitForTimeout(7_000);
  expect(promqlRequests).toBeLessThanOrEqual(afterOn + 1);
});

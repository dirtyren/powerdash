import { describe, it, expect, beforeEach } from "vitest";
import {
  listDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
} from "@/server/db/dashboards";
import { truncateDashboards } from "../setup-db";

describe("db/dashboards", () => {
  beforeEach(async () => {
    await truncateDashboards();
  });

  it("list() returns empty array when table is empty", async () => {
    expect(await listDashboards()).toEqual([]);
  });

  it("create() inserts and returns the row with generated uuid", async () => {
    const saved = await createDashboard({
      name: "Test A",
      width: 100,
      height: 100,
      widgets: [],
    });
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.name).toBe("Test A");
    expect(saved.widgets).toEqual([]);
  });

  it("list() orders by name ascending", async () => {
    await createDashboard({ name: "B", width: 1, height: 1, widgets: [] });
    await createDashboard({ name: "A", width: 1, height: 1, widgets: [] });
    const list = await listDashboards();
    expect(list.map((d) => d.name)).toEqual(["A", "B"]);
  });

  it("get() returns the full row with widgets", async () => {
    const saved = await createDashboard({
      name: "Full",
      width: 100,
      height: 100,
      widgets: [
        { id: "w1", kind: "kpi", title: "T", x: 0, y: 0, w: 10, h: 10 },
      ],
    });
    const found = await getDashboard(saved.id);
    expect(found).not.toBeNull();
    expect(found?.widgets).toHaveLength(1);
    expect(found?.widgets[0]?.id).toBe("w1");
  });

  it("get() returns null for an unknown id", async () => {
    const nope = await getDashboard("00000000-0000-0000-0000-000000000000");
    expect(nope).toBeNull();
  });

  it("update() merges fields and returns the new row", async () => {
    const saved = await createDashboard({
      name: "Old",
      width: 100,
      height: 100,
      widgets: [],
    });
    const merged = await updateDashboard(saved.id, { name: "New" });
    expect(merged?.name).toBe("New");
    expect(merged?.width).toBe(100);
  });

  it("update() bumps updatedAt", async () => {
    const saved = await createDashboard({
      name: "Old",
      width: 100,
      height: 100,
      widgets: [],
    });
    await new Promise((r) => setTimeout(r, 10));
    const merged = await updateDashboard(saved.id, { name: "New" });
    expect(merged?.updatedAt).toBeInstanceOf(Date);
    expect(merged!.updatedAt.getTime()).toBeGreaterThan(
      saved.updatedAt.getTime(),
    );
  });

  it("update() on unknown id returns null", async () => {
    const nope = await updateDashboard(
      "00000000-0000-0000-0000-000000000000",
      { name: "x" },
    );
    expect(nope).toBeNull();
  });
});

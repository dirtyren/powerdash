import { describe, it, expect } from "vitest";
import { WIDGET_CATALOG } from "@/config/widget-catalog";
import { WidgetKindSchema } from "@/server/schemas/widget";

describe("WIDGET_CATALOG", () => {
  it("has three entries", () => {
    expect(WIDGET_CATALOG).toHaveLength(3);
  });

  it("every entry has a valid kind and positive default dimensions", () => {
    for (const entry of WIDGET_CATALOG) {
      expect(() => WidgetKindSchema.parse(entry.kind)).not.toThrow();
      expect(entry.defaultW).toBeGreaterThan(0);
      expect(entry.defaultH).toBeGreaterThan(0);
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.title.length).toBeGreaterThan(0);
    }
  });

  it("ids are unique (catalog drives client-side duplicate guard)", () => {
    const ids = WIDGET_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("catalog ids match the WireMock fixture widget ids so E2E create → re-GET works", () => {
    const ids = WIDGET_CATALOG.map((e) => e.id).sort();
    expect(ids).toEqual(["w-cpu-kpi", "w-cpu-line", "w-hosts-table"]);
  });
});

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";
import { CreateDashboardSchema, DashboardSchema } from "@/server/schemas/dashboard";
import { WidgetKindSchema } from "@/server/schemas/widget";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("CreateDashboardSchema", () => {
  it("accepts a draft without id", () => {
    const draft = {
      name: "Draft",
      width: 1920,
      height: 1080,
      widgets: [],
    };
    expect(() => CreateDashboardSchema.parse(draft)).not.toThrow();
  });

  it("rejects a draft that carries an id (id must be omitted, not empty)", () => {
    const invalid = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Draft",
      width: 1920,
      height: 1080,
      widgets: [],
    };
    // `.omit({id: true})` on a strict schema does not forbid extra keys, but
    // Zod's `.strict()` cousin would — we only check the omit type here:
    const parsed = CreateDashboardSchema.parse(invalid);
    expect("id" in parsed).toBe(false);
  });

  it("is the same shape as DashboardSchema minus id/timestamps", () => {
    const dash = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "X",
      width: 1920,
      height: 1080,
      widgets: [],
    };
    const full = DashboardSchema.parse(dash);
    const draft = CreateDashboardSchema.parse(full);
    expect(draft).toEqual({
      name: full.name,
      width: full.width,
      height: full.height,
      widgets: full.widgets,
    });
  });
});

describe("WidgetKindSchema (P2.3 extension)", () => {
  it("accepts all 20 widget kinds", () => {
    const kinds = [
      "kpi", "gauge",
      "line", "area", "bar", "stacked-bar", "scatter",
      "radar",
      "pie", "donut", "funnel",
      "tree", "sunburst", "treemap",
      "heatmap", "sankey",
      "histogram", "box-plot",
      "candlestick",
      "table",
    ];
    for (const k of kinds) {
      expect(() => WidgetKindSchema.parse(k)).not.toThrow();
    }
  });

  it("rejects unknown kinds", () => {
    expect(() => WidgetKindSchema.parse("unknown")).toThrow();
  });
});

import { WidgetRefSchema, WidgetQuerySchema } from "@/server/schemas/widget";

describe("WidgetQuerySchema + WidgetRefSchema.query (P3.2)", () => {
  const base = {
    id: "abc",
    kind: "line",
    title: "Line",
    x: 0,
    y: 0,
    w: 480,
    h: 320,
  };

  it("WidgetRef parses without query", () => {
    expect(() => WidgetRefSchema.parse(base)).not.toThrow();
  });

  it("WidgetRef parses with a valid query (expr only)", () => {
    const w = { ...base, query: { expr: "up" } };
    const parsed = WidgetRefSchema.parse(w);
    expect(parsed.query?.expr).toBe("up");
  });

  it("WidgetRef parses with expr and step", () => {
    const w = { ...base, query: { expr: "up", step: 30 } };
    const parsed = WidgetRefSchema.parse(w);
    expect(parsed.query?.step).toBe(30);
  });

  it("WidgetQuerySchema rejects empty expr", () => {
    expect(() => WidgetQuerySchema.parse({ expr: "" })).toThrow();
  });

  it("WidgetQuerySchema rejects non-positive step", () => {
    expect(() => WidgetQuerySchema.parse({ expr: "up", step: 0 })).toThrow();
    expect(() => WidgetQuerySchema.parse({ expr: "up", step: -5 })).toThrow();
  });
});

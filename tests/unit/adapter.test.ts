import { describe, it, expect } from "vitest";
import { WidgetKindSchema } from "@/server/schemas/widget";
import { WIDGET_ADAPTERS } from "@/widgets/adapter";

const ALL_KINDS = WidgetKindSchema.options;

describe("WIDGET_ADAPTERS registry", () => {
  it("has an entry for every WidgetKind", () => {
    for (const kind of ALL_KINDS) {
      expect(WIDGET_ADAPTERS[kind]).toBeDefined();
    }
  });

  it("each adapter's kind matches its registry key", () => {
    for (const kind of ALL_KINDS) {
      expect(WIDGET_ADAPTERS[kind].kind).toBe(kind);
    }
  });

  it("each adapter has exactly one of buildOption or Renderer", () => {
    for (const kind of ALL_KINDS) {
      const a = WIDGET_ADAPTERS[kind];
      const hasOption = typeof a.buildOption === "function";
      const hasRenderer = typeof a.Renderer === "function";
      expect(hasOption !== hasRenderer).toBe(true);
    }
  });

  it("every adapter's family is from the WidgetFamily union", () => {
    const families = new Set([
      "stats", "series", "comparison", "part-of-whole",
      "hierarchy", "density", "distribution", "financial", "data",
    ]);
    for (const kind of ALL_KINDS) {
      expect(families.has(WIDGET_ADAPTERS[kind].family)).toBe(true);
    }
  });
});

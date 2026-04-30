import { describe, it, expect } from "vitest";
import { WIDGET_ADAPTERS } from "@/widgets/adapter";
import type { WidgetRef, WidgetKind } from "@/server/schemas/widget";

const SAMPLE_REF = (kind: WidgetKind): WidgetRef => ({
  id: "test",
  kind,
  title: "test",
  x: 0,
  y: 0,
  w: 400,
  h: 300,
});

describe("echarts adapter buildOption shapes", () => {
  for (const kind of Object.keys(WIDGET_ADAPTERS) as WidgetKind[]) {
    const adapter = WIDGET_ADAPTERS[kind];
    if (!adapter.buildOption) continue;  // kpi/line/table use Renderer

    it(`${kind}: returns an option with a non-empty series array`, () => {
      const opt = adapter.buildOption!(SAMPLE_REF(kind)) as { series?: unknown };
      expect(opt.series).toBeDefined();
      expect(Array.isArray(opt.series) || typeof opt.series === "object").toBe(true);
      const arr = Array.isArray(opt.series) ? opt.series : [opt.series];
      expect(arr.length).toBeGreaterThan(0);
    });

    it(`${kind}: every series has a type string`, () => {
      const opt = adapter.buildOption!(SAMPLE_REF(kind)) as { series?: unknown };
      const arr = Array.isArray(opt.series) ? opt.series : [opt.series];
      for (const s of arr) {
        expect(typeof (s as { type: string }).type).toBe("string");
        expect(((s as { type: string }).type || "").length).toBeGreaterThan(0);
      }
    });
  }
});

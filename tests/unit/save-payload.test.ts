import { describe, it, expect } from "vitest";
import { buildSaveDashboardBody } from "@/server/seagull/save-payload";
import type { Dashboard } from "@/server/schemas/dashboard";

const dashboard: Dashboard = {
  id: "1",
  name: "Infrastructure Overview",
  owner: "opuser",
  widgets: [
    { id: "w-cpu-kpi", kind: "kpi", title: "CPU %", x: 0, y: 0, w: 3, h: 2 },
    { id: "w-cpu-line", kind: "line", title: "CPU over time", x: 3, y: 0, w: 6, h: 4 },
  ],
};

describe("buildSaveDashboardBody", () => {
  it("produces x-www-form-urlencoded body with a single 'json' field", () => {
    const body = buildSaveDashboardBody(dashboard);
    const params = new URLSearchParams(body);
    const keys = [...params.keys()];
    expect(keys).toEqual(["json"]);
  });

  it("JSON envelope contains id, name, owner as username, and widgets array", () => {
    const body = buildSaveDashboardBody(dashboard);
    const params = new URLSearchParams(body);
    const jsonStr = params.get("json");
    if (!jsonStr) throw new Error("json field missing");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    expect(parsed.id).toBe("1");
    expect(parsed.name).toBe("Infrastructure Overview");
    expect(parsed.username).toBe("opuser");
    expect(parsed.widgets).toEqual(dashboard.widgets);
  });

  it("emits empty strings for legacy AMF fields (diagram, metadata, background, image, sound, svg)", () => {
    const body = buildSaveDashboardBody(dashboard);
    const jsonStr = new URLSearchParams(body).get("json");
    if (!jsonStr) throw new Error("json field missing");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    for (const k of ["diagram", "metadata", "background", "image", "sound", "svg"]) {
      expect(parsed[k]).toBe("");
    }
  });

  it("includes sensible defaults for acl, allmayview, timer, scale, width, height", () => {
    const body = buildSaveDashboardBody(dashboard);
    const jsonStr = new URLSearchParams(body).get("json");
    if (!jsonStr) throw new Error("json field missing");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    expect(parsed.acl).toBe("0");
    expect(parsed.allmayview).toBe("1");
    expect(parsed.timer).toBe("15000");
    expect(parsed.scale).toBe("1");
    expect(parsed.scalestretch).toBe("1");
    expect(parsed.width).toBe("1920");
    expect(parsed.height).toBe("1080");
  });

  it("escapes special characters safely through URLSearchParams", () => {
    const d: Dashboard = {
      ...dashboard,
      name: 'A & B <x> "quoted"',
      widgets: [{ id: "w1", kind: "kpi", title: "5 > 3 & 2 < 4", x: 0, y: 0, w: 1, h: 1 }],
    };
    const body = buildSaveDashboardBody(d);
    const jsonStr = new URLSearchParams(body).get("json");
    if (!jsonStr) throw new Error("json field missing");
    const parsed = JSON.parse(jsonStr) as { name: string; widgets: Array<{ title: string }> };
    expect(parsed.name).toBe('A & B <x> "quoted"');
    expect(parsed.widgets[0]?.title).toBe("5 > 3 & 2 < 4");
  });
});

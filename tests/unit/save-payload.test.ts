import { describe, it, expect } from "vitest";
import { buildSaveDashboardBody } from "@/server/seagull/save-payload";
import type { Dashboard } from "@/server/schemas/dashboard";

const dashboard: Dashboard = {
  id: "1",
  name: "Infrastructure Overview",
  owner: "opuser",
  width: 1600,
  height: 900,
  widgets: [
    { id: "w-cpu-kpi", kind: "kpi", title: "CPU %", x: 20, y: 20, w: 260, h: 160 },
    { id: "w-cpu-line", kind: "line", title: "CPU over time", x: 300, y: 20, w: 720, h: 320 },
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

  it("emits dashboard canvas width/height (not hardcoded defaults)", () => {
    const body = buildSaveDashboardBody(dashboard);
    const jsonStr = new URLSearchParams(body).get("json");
    if (!jsonStr) throw new Error("json field missing");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    expect(parsed.width).toBe("1600");
    expect(parsed.height).toBe("900");
  });

  it("includes sensible defaults for acl, allmayview, timer, scale", () => {
    const body = buildSaveDashboardBody(dashboard);
    const jsonStr = new URLSearchParams(body).get("json");
    if (!jsonStr) throw new Error("json field missing");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    expect(parsed.acl).toBe("0");
    expect(parsed.allmayview).toBe("1");
    expect(parsed.timer).toBe("15000");
    expect(parsed.scale).toBe("1");
    expect(parsed.scalestretch).toBe("1");
  });

  it("escapes special characters safely through URLSearchParams", () => {
    const d: Dashboard = {
      ...dashboard,
      name: 'A & B <x> "quoted"',
      widgets: [{ id: "w1", kind: "kpi", title: "5 > 3 & 2 < 4", x: 20, y: 20, w: 260, h: 160 }],
    };
    const body = buildSaveDashboardBody(d);
    const jsonStr = new URLSearchParams(body).get("json");
    if (!jsonStr) throw new Error("json field missing");
    const parsed = JSON.parse(jsonStr) as { name: string; widgets: Array<{ title: string }> };
    expect(parsed.name).toBe('A & B <x> "quoted"');
    expect(parsed.widgets[0]?.title).toBe("5 > 3 & 2 < 4");
  });
});

import type { CreateDashboard } from "@/server/schemas/dashboard";

const draft: CreateDashboard = {
  name: "New",
  owner: "opuser",
  width: 1920,
  height: 1080,
  widgets: [
    { id: "w-cpu-kpi", kind: "kpi", title: "CPU %", x: 20, y: 20, w: 260, h: 160 },
  ],
};

describe("buildSaveDashboardBody — create-shape", () => {
  it("omits the 'id' field entirely when the input has no id", () => {
    const body = buildSaveDashboardBody(draft);
    const jsonStr = new URLSearchParams(body).get("json");
    if (!jsonStr) throw new Error("json field missing");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    expect("id" in parsed).toBe(false);
  });

  it("still emits username/widgets/width/height for a draft", () => {
    const body = buildSaveDashboardBody(draft);
    const jsonStr = new URLSearchParams(body).get("json");
    if (!jsonStr) throw new Error("json field missing");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    expect(parsed.username).toBe("opuser");
    expect(parsed.width).toBe("1920");
    expect(parsed.height).toBe("1080");
    expect(parsed.widgets).toEqual(draft.widgets);
  });

  it("still emits empty AMF legacy fields for a draft", () => {
    const body = buildSaveDashboardBody(draft);
    const parsed = JSON.parse(new URLSearchParams(body).get("json")!) as Record<string, unknown>;
    for (const k of ["diagram", "metadata", "background", "image", "sound", "svg"]) {
      expect(parsed[k]).toBe("");
    }
  });
});

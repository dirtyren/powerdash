import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

describe("listDashboards", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("parses seagull XML into typed summaries", async () => {
    const xml = `<?xml version="1.0"?>
      <response>
        <dashboards>
          <dashboard><id>1</id><name>Infra</name><owner>opuser</owner></dashboard>
          <dashboard><id>2</id><name>Net</name><owner>opuser</owner></dashboard>
        </dashboards>
      </response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(xml, { status: 200 }))),
    );

    const { listDashboards } = await import("@/server/seagull/dashboards");
    const result = await listDashboards();
    expect(result).toEqual([
      { id: "1", name: "Infra", owner: "opuser" },
      { id: "2", name: "Net", owner: "opuser" },
    ]);
  });

  it("throws SeagullError on 5xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("boom", { status: 500 }))),
    );
    const { listDashboards } = await import("@/server/seagull/dashboards");
    await expect(listDashboards()).rejects.toThrow(/seagull .* failed: 500/);
  });

  it("rejects XML that fails schema validation", async () => {
    const xml = `<?xml version="1.0"?>
      <response><dashboards><dashboard><id></id></dashboard></dashboards></response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(xml, { status: 200 }))),
    );
    const { listDashboards } = await import("@/server/seagull/dashboards");
    await expect(listDashboards()).rejects.toThrow();
  });
});

describe("getDashboard", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("populates canvas width/height from the response", async () => {
    const xml = `<?xml version="1.0"?>
      <response><dashboard>
        <id>1</id><name>Infra</name><owner>opuser</owner>
        <width>1600</width><height>900</height>
        <widgets>
          <widget>
            <id>w-cpu-kpi</id><kind>kpi</kind><title>CPU %</title>
            <x>20</x><y>20</y><w>260</w><h>160</h>
          </widget>
        </widgets>
      </dashboard></response>`;
    vi.stubGlobal(
      "fetch",
      () => Promise.resolve(new Response(xml, { status: 200 })),
    );
    const { getDashboard } = await import("@/server/seagull/dashboards");
    const d = await getDashboard("1");
    expect(d.width).toBe(1600);
    expect(d.height).toBe(900);
  });

  it("defaults canvas width/height when the response omits them", async () => {
    const xml = `<?xml version="1.0"?>
      <response><dashboard>
        <id>1</id><name>Infra</name><owner>opuser</owner>
        <widgets>
          <widget>
            <id>w-cpu-kpi</id><kind>kpi</kind><title>CPU %</title>
            <x>20</x><y>20</y><w>260</w><h>160</h>
          </widget>
        </widgets>
      </dashboard></response>`;
    vi.stubGlobal(
      "fetch",
      () => Promise.resolve(new Response(xml, { status: 200 })),
    );
    const { getDashboard } = await import("@/server/seagull/dashboards");
    const d = await getDashboard("1");
    expect(d.width).toBe(1920);
    expect(d.height).toBe(1080);
  });
});

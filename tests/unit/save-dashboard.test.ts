import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

const SAVE_PATH = "/opmon/seagull/www/index.php/wsconnector/action/savedashboard";

describe("saveDashboard", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("POSTs form-encoded body, re-fetches on success, and returns the fresh dashboard", async () => {
    const fetchSpy = vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const u = url instanceof Request ? url.url : url.toString();
      if (u.endsWith(SAVE_PATH)) {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({
          "Content-Type": "application/x-www-form-urlencoded",
        });
        const bodyStr = typeof init?.body === "string" ? init.body : "";
        expect(bodyStr.startsWith("json=")).toBe(true);
        return Promise.resolve(new Response(JSON.stringify({ output: 1 }), { status: 200 }));
      }
      // second call: getDashboard re-fetch
      const echoXml = `<?xml version="1.0"?>
        <response><dashboard>
          <id>1</id><name>Infra</name><owner>opuser</owner>
          <widgets>
            <widget><id>w-cpu-kpi</id><kind>kpi</kind><title>CPU %</title>
              <x>0</x><y>0</y><w>3</w><h>2</h></widget>
          </widgets>
        </dashboard></response>`;
      return Promise.resolve(new Response(echoXml, { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { saveDashboard } = await import("@/server/seagull/dashboards");
    const result = await saveDashboard({
      id: "1",
      name: "Infra",
      owner: "opuser",
      widgets: [{ id: "w-cpu-kpi", kind: "kpi", title: "CPU %", x: 0, y: 0, w: 3, h: 2 }],
    });

    expect(result.id).toBe("1");
    expect(result.widgets).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throws SaveDashboardError with code -2 on duplicate name", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(JSON.stringify({ output: -2 }), { status: 200 })),
    );
    const { saveDashboard } = await import("@/server/seagull/dashboards");
    const { SaveDashboardError } = await import("@/server/seagull/client");
    const p = saveDashboard({ id: "1", name: "x", owner: "y", widgets: [] });
    await expect(p).rejects.toBeInstanceOf(SaveDashboardError);
    await expect(p).rejects.toMatchObject({ code: -2 });
  });

  it("throws SeagullError on HTTP 5xx", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("boom", { status: 500 })));
    const { saveDashboard } = await import("@/server/seagull/dashboards");
    const { SeagullError } = await import("@/server/seagull/client");
    await expect(
      saveDashboard({ id: "1", name: "x", owner: "y", widgets: [] }),
    ).rejects.toBeInstanceOf(SeagullError);
  });
});

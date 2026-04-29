import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

describe("POST /api/dashboards", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("422s on an invalid body", async () => {
    const { POST } = await import("@app/api/dashboards/route");
    const req = new Request("http://localhost/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nope: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("200s with the created dashboard on success (forwards to saveDashboard)", async () => {
    const SAVE_PATH = "/opmon/seagull/www/index.php/wsconnector/action/savedashboard";
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      const u = url instanceof Request ? url.url : url.toString();
      if (u.endsWith(SAVE_PATH)) {
        return Promise.resolve(new Response(JSON.stringify({ output: 7 }), { status: 200 }));
      }
      // re-fetch after save
      return Promise.resolve(
        new Response(
          `<?xml version="1.0"?><response><dashboard>
            <id>7</id><name>New</name><owner>opuser</owner>
            <width>1920</width><height>1080</height>
            <widgets><widget><id>w1</id><kind>kpi</kind><title>KPI</title><x>0</x><y>0</y><w>100</w><h>100</h></widget></widgets>
          </dashboard></response>`,
          { status: 200 },
        ),
      );
    });

    const { POST } = await import("@app/api/dashboards/route");
    const req = new Request("http://localhost/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New",
        owner: "opuser",
        width: 1920,
        height: 1080,
        widgets: [],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe("7");
  });

  it("409s on duplicate name (output: -2)", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(JSON.stringify({ output: -2 }), { status: 200 })),
    );
    const { POST } = await import("@app/api/dashboards/route");
    const req = new Request("http://localhost/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "dup",
        owner: "opuser",
        width: 1920,
        height: 1080,
        widgets: [],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});

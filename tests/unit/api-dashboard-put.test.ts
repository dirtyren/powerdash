import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/dashboards/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const SAVE_PATH = "/opmon/seagull/www/index.php/wsconnector/action/savedashboard";

const detailXml = `<?xml version="1.0"?>
  <response><dashboard><id>1</id><name>Infra</name><owner>opuser</owner>
    <width>1920</width><height>1080</height>
    <widgets>
      <widget><id>w-cpu-kpi</id><kind>kpi</kind><title>CPU %</title>
        <x>20</x><y>20</y><w>260</w><h>160</h></widget>
    </widgets>
  </dashboard></response>`;

describe("PUT /api/dashboards/[id]", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("returns 200 with the saved dashboard on success", async () => {
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      const u = url instanceof Request ? url.url : url.toString();
      return u.endsWith(SAVE_PATH)
        ? Promise.resolve(
            new Response(JSON.stringify({ output: 1 }), { status: 200 }),
          )
        : Promise.resolve(new Response(detailXml, { status: 200 }));
    });

    const { PUT } = await import("@app/api/dashboards/[id]/route");
    const response = await PUT(
      makeRequest({
        widgets: [
          { id: "w-cpu-kpi", kind: "kpi", title: "CPU %", x: 20, y: 20, w: 260, h: 160 },
        ],
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; widgets: unknown[] };
    expect(body.id).toBe("1");
  });

  it("returns 422 on invalid request body (missing fields)", async () => {
    const { PUT } = await import("@app/api/dashboards/[id]/route");
    const response = await PUT(
      makeRequest({ widgets: [{ id: "", kind: "kpi" }] }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(422);
  });

  it("returns 409 on duplicate name (seagull output=-2)", async () => {
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      const u = url instanceof Request ? url.url : url.toString();
      return u.endsWith(SAVE_PATH)
        ? Promise.resolve(
            new Response(JSON.stringify({ output: -2 }), { status: 200 }),
          )
        : Promise.resolve(new Response(detailXml, { status: 200 }));
    });

    const { PUT } = await import("@app/api/dashboards/[id]/route");
    const response = await PUT(
      makeRequest({
        widgets: [{ id: "w", kind: "kpi", title: "T", x: 10, y: 10, w: 100, h: 100 }],
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(409);
  });

  it("returns 502 on upstream 5xx", async () => {
    vi.stubGlobal(
      "fetch",
      () => Promise.resolve(new Response("boom", { status: 500 })),
    );
    const { PUT } = await import("@app/api/dashboards/[id]/route");
    const response = await PUT(
      makeRequest({
        widgets: [{ id: "w", kind: "kpi", title: "T", x: 10, y: 10, w: 100, h: 100 }],
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(502);
  });
});

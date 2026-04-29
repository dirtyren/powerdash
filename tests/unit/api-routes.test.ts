import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

describe("GET /api/dashboards", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("returns typed JSON array on success", async () => {
    const xml = `<?xml version="1.0"?>
      <response><dashboards>
        <dashboard><id>1</id><name>A</name><owner>u</owner></dashboard>
      </dashboards></response>`;
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(xml, { status: 200 })));

    const { GET } = await import("@app/api/dashboards/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual([{ id: "1", name: "A", owner: "u" }]);
  });

  it("returns 502 when seagull fails", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("x", { status: 500 })));
    const { GET } = await import("@app/api/dashboards/route");
    const response = await GET();
    expect(response.status).toBe(502);
  });
});

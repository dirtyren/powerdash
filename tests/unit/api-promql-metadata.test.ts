import { describe, it, expect, beforeEach, vi } from "vitest";

describe("GET /api/promql/metadata", () => {
  beforeEach(() => {
    process.env.PROMETHEUS_BASE_URL = "http://prom.test";
    vi.restoreAllMocks();
  });

  it("200s with the metadata map", async () => {
    const payload = {
      status: "success",
      data: {
        up: [{ type: "gauge", help: "1 when up", unit: "" }],
      },
    };
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(JSON.stringify(payload), { status: 200 })),
    );
    const { GET } = await import("@app/api/promql/metadata/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Record<string, Array<{ type: string }>>;
    };
    expect(body.data.up?.[0]?.type).toBe("gauge");
  });

  it("502s on upstream HTTP error", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("boom", { status: 500 })),
    );
    const { GET } = await import("@app/api/promql/metadata/route");
    const res = await GET();
    expect(res.status).toBe(502);
  });
});

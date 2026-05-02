import { describe, it, expect, beforeEach, vi } from "vitest";

describe("GET /api/promql/labels", () => {
  beforeEach(() => {
    process.env.PROMETHEUS_BASE_URL = "http://prom.test";
    vi.restoreAllMocks();
  });

  it("200s with labels on a successful upstream call", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ status: "success", data: ["__name__", "job"] }),
          { status: 200 },
        ),
      ),
    );
    const { GET } = await import("@app/api/promql/labels/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string[] };
    expect(body.data).toEqual(["__name__", "job"]);
  });

  it("502s on upstream HTTP error", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("boom", { status: 500 })),
    );
    const { GET } = await import("@app/api/promql/labels/route");
    const res = await GET();
    expect(res.status).toBe(502);
  });

  it("502s on Prometheus {status:'error'} payload", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ status: "error", errorType: "bad_data", error: "x" }),
          { status: 200 },
        ),
      ),
    );
    const { GET } = await import("@app/api/promql/labels/route");
    const res = await GET();
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("promql");
  });
});

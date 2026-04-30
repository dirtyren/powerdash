import { describe, it, expect, beforeEach, vi } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/promql/query_range", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/promql/query_range", () => {
  beforeEach(() => {
    process.env.PROMETHEUS_BASE_URL = "http://prom.test";
    vi.restoreAllMocks();
  });

  it("422s on missing expr", async () => {
    const { POST } = await import("@app/api/promql/query_range/route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(422);
  });

  it("200s on a successful range-matrix response and forwards params", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      const u = url instanceof Request ? url.url : url.toString();
      calls.push(u);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: "success",
            data: {
              resultType: "matrix",
              result: [{ metric: { __name__: "up" }, values: [[1714348800, "1"]] }],
            },
          }),
          { status: 200 },
        ),
      );
    });

    const { POST } = await import("@app/api/promql/query_range/route");
    const res = await POST(
      makeRequest({ expr: "up", start: 1714348800, end: 1714348815, step: 15 }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { result: unknown[] } };
    expect(body.data.result).toHaveLength(1);

    const u = new URL(calls[0]!);
    expect(u.pathname).toBe("/api/v1/query_range");
    expect(u.searchParams.get("query")).toBe("up");
    expect(u.searchParams.get("start")).toBe("1714348800");
    expect(u.searchParams.get("end")).toBe("1714348815");
    expect(u.searchParams.get("step")).toBe("15");
  });

  it("defaults start/end/step when omitted", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      calls.push(url instanceof Request ? url.url : url.toString());
      return Promise.resolve(
        new Response(
          JSON.stringify({ status: "success", data: { resultType: "matrix", result: [] } }),
          { status: 200 },
        ),
      );
    });

    const { POST } = await import("@app/api/promql/query_range/route");
    const res = await POST(makeRequest({ expr: "up" }));
    expect(res.status).toBe(200);

    const u = new URL(calls[0]!);
    expect(u.searchParams.get("step")).toBe("15");
    const start = Number(u.searchParams.get("start"));
    const end = Number(u.searchParams.get("end"));
    // end is roughly "now" in seconds; start is end - 3600
    expect(end - start).toBe(3600);
  });

  it("502s on upstream HTTP error", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("boom", { status: 500 })),
    );
    const { POST } = await import("@app/api/promql/query_range/route");
    const res = await POST(makeRequest({ expr: "up" }));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("upstream");
  });

  it("502s on Prometheus {status: 'error'} payload with errorType", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ status: "error", errorType: "bad_data", error: "syntax" }),
          { status: 200 },
        ),
      ),
    );
    const { POST } = await import("@app/api/promql/query_range/route");
    const res = await POST(makeRequest({ expr: "!!!" }));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; errorType?: string };
    expect(body.error).toBe("promql");
    expect(body.errorType).toBe("bad_data");
  });
});

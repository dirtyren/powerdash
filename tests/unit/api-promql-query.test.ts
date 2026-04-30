import { describe, it, expect, beforeEach, vi } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/promql/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/promql/query", () => {
  beforeEach(() => {
    process.env.PROMETHEUS_BASE_URL = "http://prom.test";
    vi.restoreAllMocks();
  });

  it("422s on missing expr", async () => {
    const { POST } = await import("@app/api/promql/query/route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(422);
  });

  it("200s on a successful instant-vector response and forwards time", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      const u = url instanceof Request ? url.url : url.toString();
      calls.push(u);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: "success",
            data: {
              resultType: "vector",
              result: [{ metric: { __name__: "up" }, value: [1714348800, "1"] }],
            },
          }),
          { status: 200 },
        ),
      );
    });

    const { POST } = await import("@app/api/promql/query/route");
    const res = await POST(makeRequest({ expr: "up", time: 1714348800 }));
    expect(res.status).toBe(200);

    const u = new URL(calls[0]!);
    expect(u.pathname).toBe("/api/v1/query");
    expect(u.searchParams.get("query")).toBe("up");
    expect(u.searchParams.get("time")).toBe("1714348800");
  });

  it("502s on upstream HTTP error", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("boom", { status: 500 })),
    );
    const { POST } = await import("@app/api/promql/query/route");
    const res = await POST(makeRequest({ expr: "up" }));
    expect(res.status).toBe(502);
  });
});

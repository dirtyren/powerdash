import { describe, it, expect, beforeEach, vi } from "vitest";

describe("GET /api/promql/label/[name]/values", () => {
  beforeEach(() => {
    process.env.PROMETHEUS_BASE_URL = "http://prom.test";
    vi.restoreAllMocks();
  });

  it("200s with values and forwards the path parameter", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      const u = url instanceof Request ? url.url : url.toString();
      calls.push(u);
      return Promise.resolve(
        new Response(
          JSON.stringify({ status: "success", data: ["prometheus", "worker"] }),
          { status: 200 },
        ),
      );
    });

    const { GET } = await import(
      "@app/api/promql/label/[name]/values/route"
    );
    const res = await GET(
      new Request("http://localhost/api/promql/label/job/values"),
      { params: Promise.resolve({ name: "job" }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string[] };
    expect(body.data).toEqual(["prometheus", "worker"]);
    expect(calls[0]).toContain("/api/v1/label/job/values");
  });

  it("URL-encodes names like __name__", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      calls.push(url instanceof Request ? url.url : url.toString());
      return Promise.resolve(
        new Response(
          JSON.stringify({ status: "success", data: ["up"] }),
          { status: 200 },
        ),
      );
    });
    const { GET } = await import(
      "@app/api/promql/label/[name]/values/route"
    );
    const res = await GET(
      new Request("http://localhost/api/promql/label/__name__/values"),
      { params: Promise.resolve({ name: "__name__" }) },
    );
    expect(res.status).toBe(200);
    expect(calls[0]).toContain("/api/v1/label/__name__/values");
  });

  it("502s on upstream HTTP error", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("boom", { status: 500 })),
    );
    const { GET } = await import(
      "@app/api/promql/label/[name]/values/route"
    );
    const res = await GET(
      new Request("http://localhost/api/promql/label/job/values"),
      { params: Promise.resolve({ name: "job" }) },
    );
    expect(res.status).toBe(502);
  });
});

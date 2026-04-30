import { describe, it, expect, beforeEach, vi } from "vitest";

describe("callPrometheus", () => {
  beforeEach(() => {
    process.env.PROMETHEUS_BASE_URL = "http://prom.test";
    vi.restoreAllMocks();
  });

  it("constructs the URL from base + path + params and returns parsed JSON", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      const u = url instanceof Request ? url.url : url.toString();
      calls.push(u);
      return Promise.resolve(
        new Response(JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }), {
          status: 200,
        }),
      );
    });

    const { callPrometheus } = await import("@/server/prometheus/client");
    const result = await callPrometheus("/api/v1/query", new URLSearchParams({ query: "up" }));

    expect(calls[0]).toBe("http://prom.test/api/v1/query?query=up");
    expect(result).toMatchObject({ status: "success" });
  });

  it("strips a trailing slash from PROMETHEUS_BASE_URL", async () => {
    process.env.PROMETHEUS_BASE_URL = "http://prom.test/";
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      const u = url instanceof Request ? url.url : url.toString();
      calls.push(u);
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const { callPrometheus } = await import("@/server/prometheus/client");
    await callPrometheus("/api/v1/query", new URLSearchParams({ query: "up" }));
    expect(calls[0]).toBe("http://prom.test/api/v1/query?query=up");
  });

  it("throws PrometheusError with status on non-2xx response", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("boom", { status: 500 })),
    );
    const { callPrometheus, PrometheusError } = await import("@/server/prometheus/client");
    await expect(
      callPrometheus("/api/v1/query", new URLSearchParams({ query: "up" })),
    ).rejects.toBeInstanceOf(PrometheusError);
    await expect(
      callPrometheus("/api/v1/query", new URLSearchParams({ query: "up" })),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("defaults to http://localhost:9090 when PROMETHEUS_BASE_URL is unset", async () => {
    delete process.env.PROMETHEUS_BASE_URL;
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      calls.push(url instanceof Request ? url.url : url.toString());
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
    const { callPrometheus } = await import("@/server/prometheus/client");
    await callPrometheus("/api/v1/query", new URLSearchParams({ query: "up" }));
    expect(calls[0]?.startsWith("http://localhost:9090/")).toBe(true);
  });
});

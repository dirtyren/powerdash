import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPromClient } from "@/widgets/promql/prom-client";

describe("createPromClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("labelNames() fetches /api/promql/labels and returns data", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ status: "success", data: ["job", "instance"] }),
          { status: 200 },
        ),
      ),
    );
    const client = createPromClient();
    const names = await client.labelNames();
    expect(names).toEqual(["job", "instance"]);
  });

  it("labelValues('job') fetches /api/promql/label/job/values", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      calls.push(url instanceof Request ? url.url : url.toString());
      return Promise.resolve(
        new Response(
          JSON.stringify({ status: "success", data: ["prometheus"] }),
          { status: 200 },
        ),
      );
    });
    const client = createPromClient();
    const values = await client.labelValues("job");
    expect(values).toEqual(["prometheus"]);
    expect(calls[0]).toContain("/api/promql/label/job/values");
  });

  it("metricNames() fetches /api/promql/label/__name__/values", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string | URL | Request) => {
      calls.push(url instanceof Request ? url.url : url.toString());
      return Promise.resolve(
        new Response(
          JSON.stringify({ status: "success", data: ["up", "scrape_duration_seconds"] }),
          { status: 200 },
        ),
      );
    });
    const client = createPromClient();
    const metrics = await client.metricNames();
    expect(metrics).toEqual(["up", "scrape_duration_seconds"]);
    expect(calls[0]).toContain("/api/promql/label/__name__/values");
  });

  it("metricMetadata() fetches /api/promql/metadata and returns the data object", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            status: "success",
            data: { up: [{ type: "gauge", help: "1 when up", unit: "" }] },
          }),
          { status: 200 },
        ),
      ),
    );
    const client = createPromClient();
    const meta = await client.metricMetadata();
    expect(meta.up?.[0]?.type).toBe("gauge");
  });

  it("series() returns empty array (matcher lookup deferred)", async () => {
    const client = createPromClient();
    const s = await client.series("up");
    expect(s).toEqual([]);
  });

  it("flags() returns empty object", async () => {
    const client = createPromClient();
    const f = await client.flags();
    expect(f).toEqual({});
  });

  it("throws on non-2xx", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("nope", { status: 500 })),
    );
    const client = createPromClient();
    await expect(client.labelNames()).rejects.toThrow();
  });
});

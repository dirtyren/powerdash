import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

describe("getWidgetData", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("parses KPI payload", async () => {
    const xml = `<?xml version="1.0"?>
      <response><widget kind="kpi"><value>42.5</value><unit>%</unit><delta>-1.2</delta></widget></response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(xml, { status: 200 }))),
    );
    const { getWidgetData } = await import("@/server/seagull/widgets");
    const data = await getWidgetData("w-kpi");
    expect(data).toEqual({ kind: "kpi", value: 42.5, unit: "%", delta: -1.2 });
  });

  it("parses line-series payload with multiple series", async () => {
    const xml = `<?xml version="1.0"?>
      <response><widget kind="line">
        <series><name>cpu</name><point><t>2026-04-29T00:00:00Z</t><v>10</v></point><point><t>2026-04-29T00:01:00Z</t><v>12</v></point></series>
        <series><name>mem</name><point><t>2026-04-29T00:00:00Z</t><v>30</v></point></series>
      </widget></response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(xml, { status: 200 }))),
    );
    const { getWidgetData } = await import("@/server/seagull/widgets");
    const data = await getWidgetData("w-line");
    expect(data.kind).toBe("line");
    if (data.kind !== "line") throw new Error("kind");
    expect(data.series.length).toBe(2);
    expect(data.series[0]?.points.length).toBe(2);
  });

  it("parses table payload", async () => {
    const xml = `<?xml version="1.0"?>
      <response><widget kind="table">
        <column><key>host</key><label>Host</label></column>
        <column><key>up</key><label>Up</label></column>
        <row><host>h1</host><up>yes</up></row>
        <row><host>h2</host><up>no</up></row>
      </widget></response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(xml, { status: 200 }))),
    );
    const { getWidgetData } = await import("@/server/seagull/widgets");
    const data = await getWidgetData("w-table");
    expect(data.kind).toBe("table");
    if (data.kind !== "table") throw new Error("kind");
    expect(data.columns.map((c) => c.key)).toEqual(["host", "up"]);
    expect(data.rows).toHaveLength(2);
  });
});

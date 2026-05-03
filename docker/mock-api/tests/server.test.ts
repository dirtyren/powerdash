import { describe, it, expect, beforeEach } from "vitest";
import { buildServer } from "../src/server";
import { reset, list, get, set, allocateId } from "../src/store";
import type { StoredDashboard } from "../src/types";
import { escapeXML, serializeList, serializeDetail } from "../src/xml";

describe("server scaffold", () => {
  it("responds to /health", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});

describe("store", () => {
  beforeEach(() => reset());

  it("seeds dashboard 1 on reset", () => {
    const seed = get("1");
    expect(seed).toBeDefined();
    expect(seed?.name).toBe("Infrastructure Overview");
    expect(seed?.widgets).toHaveLength(3);
  });

  it("list() returns all dashboards", () => {
    expect(list().map((d) => d.id)).toEqual(["1"]);
  });

  it("allocateId() returns sequential stringified integers starting after seed max", () => {
    expect(allocateId()).toBe("2");
    expect(allocateId()).toBe("3");
  });

  it("set() inserts or updates by id", () => {
    const d: StoredDashboard = {
      id: "42", name: "x", owner: "u", width: 100, height: 100, widgets: [],
    };
    set("42", d);
    expect(get("42")).toEqual(d);
  });

  it("reset() restores the seed and clears other entries", () => {
    set("99", { id: "99", name: "tmp", owner: "u", width: 100, height: 100, widgets: [] });
    expect(get("99")).toBeDefined();
    reset();
    expect(get("99")).toBeUndefined();
    expect(get("1")).toBeDefined();
  });

  it("reset() does not share mutable state with SEED_DASHBOARDS", () => {
    const s = get("1")!;
    s.name = "mutated";
    reset();
    expect(get("1")?.name).toBe("Infrastructure Overview");
  });
});

describe("xml serialization", () => {
  it("escapeXML handles all 5 XML entities", () => {
    expect(escapeXML(`a & b < c > d " e ' f`)).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f",
    );
  });

  it("serializeList emits a <response><dashboards><dashboard> tree", () => {
    const xml = serializeList([
      { id: "1", name: "A", owner: "u", width: 1, height: 1, widgets: [] },
      { id: "2", name: "B", owner: "u", width: 1, height: 1, widgets: [] },
    ]);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain("<response>");
    expect(xml).toContain("<dashboards>");
    expect(xml).toContain("<id>1</id>");
    expect(xml).toContain("<name>A</name>");
    expect(xml).toContain("<id>2</id>");
    expect(xml).toContain("<name>B</name>");
  });

  it("serializeDetail emits id, name, owner, width, height, widgets", () => {
    const xml = serializeDetail({
      id: "1",
      name: "A",
      owner: "u",
      width: 1920,
      height: 1080,
      widgets: [
        { id: "w1", kind: "kpi", title: "T", x: 1, y: 2, w: 3, h: 4 },
      ],
    });
    expect(xml).toContain("<id>1</id>");
    expect(xml).toContain("<width>1920</width>");
    expect(xml).toContain("<height>1080</height>");
    expect(xml).toContain("<widget>");
    expect(xml).toContain("<id>w1</id>");
    expect(xml).toContain("<kind>kpi</kind>");
    expect(xml).toContain("<x>1</x>");
    expect(xml).toContain("<h>4</h>");
  });

  it("serializeDetail emits <query> only when present", () => {
    const without = serializeDetail({
      id: "1", name: "A", owner: "u", width: 1, height: 1,
      widgets: [{ id: "w1", kind: "kpi", title: "T", x: 1, y: 2, w: 3, h: 4 }],
    });
    expect(without).not.toContain("<query>");

    const withQuery = serializeDetail({
      id: "1", name: "A", owner: "u", width: 1, height: 1,
      widgets: [{
        id: "w1", kind: "kpi", title: "T", x: 1, y: 2, w: 3, h: 4,
        query: { expr: "up", step: 30 },
      }],
    });
    expect(withQuery).toContain("<query>");
    expect(withQuery).toContain("<expr>up</expr>");
    expect(withQuery).toContain("<step>30</step>");
  });

  it("serializeDetail escapes XML-special chars in values", () => {
    const xml = serializeDetail({
      id: "1", name: "A & B", owner: "u", width: 1, height: 1,
      widgets: [{
        id: "w1", kind: "kpi", title: "Mix", x: 1, y: 2, w: 3, h: 4,
        query: { expr: `up{job="api"}` },
      }],
    });
    expect(xml).toContain("<name>A &amp; B</name>");
    expect(xml).toContain("<expr>up{job=&quot;api&quot;}</expr>");
  });
});

describe("dashboard routes", () => {
  beforeEach(() => reset());

  it("GET /dashboards/list.xml returns the seed list", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/dashboards/list.xml" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/xml/);
    expect(res.body).toContain("<name>Infrastructure Overview</name>");
    expect(res.body).toContain("<id>1</id>");
    await app.close();
  });

  it("GET /dashboards/1.xml returns the full seed dashboard", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/dashboards/1.xml" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<name>Infrastructure Overview</name>");
    expect(res.body).toContain("<widget>");
    expect(res.body).toContain("<id>w-cpu-kpi</id>");
    await app.close();
  });

  it("GET /dashboards/999.xml returns 404", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/dashboards/999.xml" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("list reflects newly added dashboards", async () => {
    set("7", { id: "7", name: "Added", owner: "u", width: 100, height: 100, widgets: [] });
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/dashboards/list.xml" });
    expect(res.body).toContain("<name>Added</name>");
    await app.close();
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { buildServer } from "../src/server";
import { reset, list, get, set, allocateId } from "../src/store";
import type { StoredDashboard } from "../src/types";

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

import { describe, it, expect } from "vitest";
import { buildServer } from "../src/server";

describe("server scaffold", () => {
  it("responds to /health", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});

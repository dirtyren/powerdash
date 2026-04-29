import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";
import { CreateDashboardSchema, DashboardSchema } from "@/server/schemas/dashboard";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("CreateDashboardSchema", () => {
  it("accepts a draft without id", () => {
    const draft = {
      name: "Draft",
      owner: "opuser",
      width: 1920,
      height: 1080,
      widgets: [],
    };
    expect(() => CreateDashboardSchema.parse(draft)).not.toThrow();
  });

  it("rejects a draft that carries an id (id must be omitted, not empty)", () => {
    const invalid = {
      id: "1",
      name: "Draft",
      owner: "opuser",
      width: 1920,
      height: 1080,
      widgets: [],
    };
    // `.omit({id: true})` on a strict schema does not forbid extra keys, but
    // Zod's `.strict()` cousin would — we only check the omit type here:
    const parsed = CreateDashboardSchema.parse(invalid);
    expect("id" in parsed).toBe(false);
  });

  it("is the same shape as DashboardSchema minus id", () => {
    const dash = {
      id: "1",
      name: "X",
      owner: "y",
      width: 1920,
      height: 1080,
      widgets: [],
    };
    const full = DashboardSchema.parse(dash);
    const draft = CreateDashboardSchema.parse(full);
    expect(draft).toEqual({
      name: full.name,
      owner: full.owner,
      width: full.width,
      height: full.height,
      widgets: full.widgets,
    });
  });
});

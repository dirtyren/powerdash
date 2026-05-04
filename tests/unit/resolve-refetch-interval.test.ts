import { describe, it, expect } from "vitest";
import { resolveRefetchInterval } from "@/hooks/resolve-refetch-interval";

describe("resolveRefetchInterval", () => {
  it("uses an explicit number option over the context", () => {
    expect(resolveRefetchInterval(5_000, 30_000)).toBe(5_000);
  });

  it("treats an explicit null option as 'off', overriding the context", () => {
    expect(resolveRefetchInterval(null, 30_000)).toBe(false);
  });

  it("falls back to the context number when option is undefined", () => {
    expect(resolveRefetchInterval(undefined, 30_000)).toBe(30_000);
  });

  it("returns false when option is undefined and context is null", () => {
    expect(resolveRefetchInterval(undefined, null)).toBe(false);
  });

  it("returns false when both are null", () => {
    expect(resolveRefetchInterval(null, null)).toBe(false);
  });
});

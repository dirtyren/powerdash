import { describe, it, expect } from "vitest";
import { labelFor, parseValue } from "@/widgets/promql/instant-helpers";

describe("labelFor", () => {
  it("returns bare __name__ when no other labels", () => {
    expect(labelFor({ __name__: "up" })).toBe("up");
  });

  it("returns Grafana-style label set with __name__", () => {
    expect(
      labelFor({ __name__: "up", job: "prometheus", instance: "localhost:9090" }),
    ).toBe('up{job="prometheus", instance="localhost:9090"}');
  });

  it("returns label set without curly when no __name__", () => {
    expect(labelFor({ job: "prometheus" })).toBe('job="prometheus"');
  });

  it("falls back to 'series' for an empty metric", () => {
    expect(labelFor({})).toBe("series");
  });
});

describe("parseValue", () => {
  it("parses a regular float", () => {
    expect(parseValue("1.5")).toBe(1.5);
  });

  it("parses negative and zero", () => {
    expect(parseValue("-3.14")).toBe(-3.14);
    expect(parseValue("0")).toBe(0);
  });

  it("returns null for NaN / +Inf / -Inf", () => {
    expect(parseValue("NaN")).toBeNull();
    expect(parseValue("+Inf")).toBeNull();
    expect(parseValue("-Inf")).toBeNull();
  });

  it("returns null for unparseable strings", () => {
    expect(parseValue("not-a-number")).toBeNull();
    expect(parseValue("")).toBeNull();
  });
});

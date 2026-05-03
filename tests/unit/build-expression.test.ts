import { describe, it, expect } from "vitest";
import { buildExpression } from "@/widgets/promql/build-expression";
import {
  EMPTY_BUILDER_STATE,
  type BuilderState,
} from "@/widgets/promql/builder-state";

describe("buildExpression", () => {
  it("returns empty string when metric is empty", () => {
    expect(buildExpression(EMPTY_BUILDER_STATE)).toBe("");
  });

  it("emits bare metric when no filters", () => {
    const s: BuilderState = { metric: "up", filters: [] };
    expect(buildExpression(s)).toBe("up");
  });

  it("emits metric{label=\"value\"} for a single filter", () => {
    const s: BuilderState = {
      metric: "up",
      filters: [{ label: "job", op: "=", value: "prometheus" }],
    };
    expect(buildExpression(s)).toBe('up{job="prometheus"}');
  });

  it("emits multiple filters comma-separated", () => {
    const s: BuilderState = {
      metric: "http_requests_total",
      filters: [
        { label: "job", op: "=", value: "api" },
        { label: "method", op: "!=", value: "GET" },
        { label: "status", op: "=~", value: "2.." },
      ],
    };
    expect(buildExpression(s)).toBe(
      'http_requests_total{job="api", method!="GET", status=~"2.."}',
    );
  });

  it("escapes double-quotes in filter values", () => {
    const s: BuilderState = {
      metric: "up",
      filters: [{ label: "q", op: "=", value: 'fo"o' }],
    };
    expect(buildExpression(s)).toBe('up{q="fo\\"o"}');
  });

  it("drops filter rows with blank label or empty value", () => {
    const s: BuilderState = {
      metric: "up",
      filters: [
        { label: "", op: "=", value: "x" },
        { label: "job", op: "=", value: "prometheus" },
        { label: "instance", op: "=", value: "" },
      ],
    };
    expect(buildExpression(s)).toBe('up{job="prometheus"}');
  });

  it("wraps in rate() with interval", () => {
    const s: BuilderState = {
      metric: "http_requests_total",
      filters: [{ label: "job", op: "=", value: "api" }],
      rate: { kind: "rate", interval: "5m" },
    };
    expect(buildExpression(s)).toBe('rate(http_requests_total{job="api"}[5m])');
  });

  it("wraps in irate() with custom interval", () => {
    const s: BuilderState = {
      metric: "up",
      filters: [],
      rate: { kind: "irate", interval: "1m" },
    };
    expect(buildExpression(s)).toBe("irate(up[1m])");
  });

  it("wraps in aggregation with no group clause when groupKind is 'none'", () => {
    const s: BuilderState = {
      metric: "up",
      filters: [],
      aggregation: { fn: "sum", groupKind: "none", groupLabels: [] },
    };
    expect(buildExpression(s)).toBe("sum(up)");
  });

  it("emits aggregation with 'by (labels)' clause", () => {
    const s: BuilderState = {
      metric: "up",
      filters: [],
      aggregation: { fn: "sum", groupKind: "by", groupLabels: ["job"] },
    };
    expect(buildExpression(s)).toBe("sum(up) by (job)");
  });

  it("emits aggregation with 'without (labels)' clause", () => {
    const s: BuilderState = {
      metric: "up",
      filters: [],
      aggregation: { fn: "avg", groupKind: "without", groupLabels: ["instance", "pod"] },
    };
    expect(buildExpression(s)).toBe("avg(up) without (instance, pod)");
  });

  it("drops group clause when groupKind is by/without but labels is empty", () => {
    const s: BuilderState = {
      metric: "up",
      filters: [],
      aggregation: { fn: "sum", groupKind: "by", groupLabels: [] },
    };
    expect(buildExpression(s)).toBe("sum(up)");
  });

  it("composes rate + aggregation in canonical order", () => {
    const s: BuilderState = {
      metric: "http_requests_total",
      filters: [{ label: "job", op: "=", value: "api" }],
      rate: { kind: "rate", interval: "5m" },
      aggregation: { fn: "sum", groupKind: "by", groupLabels: ["method"] },
    };
    expect(buildExpression(s)).toBe(
      'sum(rate(http_requests_total{job="api"}[5m])) by (method)',
    );
  });
});

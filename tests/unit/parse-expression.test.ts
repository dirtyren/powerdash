import { describe, it, expect } from "vitest";
import { parseExpression } from "@/widgets/promql/parse-expression";
import { buildExpression } from "@/widgets/promql/build-expression";
import type { BuilderState } from "@/widgets/promql/builder-state";

describe("parseExpression", () => {
  it("returns null for empty string", () => {
    expect(parseExpression("")).toBeNull();
    expect(parseExpression("   ")).toBeNull();
  });

  it("returns null for malformed PromQL", () => {
    expect(parseExpression("sum(")).toBeNull();
    expect(parseExpression("up{")).toBeNull();
    expect(parseExpression("up{job=}")).toBeNull();
  });

  it("parses bare metric", () => {
    expect(parseExpression("up")).toEqual({
      metric: "up",
      filters: [],
    });
  });

  it("parses metric with a single filter", () => {
    expect(parseExpression('up{job="prometheus"}')).toEqual({
      metric: "up",
      filters: [{ label: "job", op: "=", value: "prometheus" }],
    });
  });

  it("parses multiple filters with all 4 operators", () => {
    expect(
      parseExpression('foo{a="1", b!="2", c=~"r", d!~"x"}'),
    ).toEqual({
      metric: "foo",
      filters: [
        { label: "a", op: "=", value: "1" },
        { label: "b", op: "!=", value: "2" },
        { label: "c", op: "=~", value: "r" },
        { label: "d", op: "!~", value: "x" },
      ],
    });
  });

  it("parses single-quoted label values", () => {
    expect(parseExpression("up{job='api'}")).toEqual({
      metric: "up",
      filters: [{ label: "job", op: "=", value: "api" }],
    });
  });

  it("parses escaped double-quotes in label values", () => {
    expect(parseExpression('up{q="fo\\"o"}')).toEqual({
      metric: "up",
      filters: [{ label: "q", op: "=", value: 'fo"o' }],
    });
  });

  it("parses rate() wrap", () => {
    expect(parseExpression("rate(up[5m])")).toEqual({
      metric: "up",
      filters: [],
      rate: { kind: "rate", interval: "5m" },
    });
  });

  it("parses irate() wrap with custom interval", () => {
    expect(parseExpression("irate(up[1m])")).toEqual({
      metric: "up",
      filters: [],
      rate: { kind: "irate", interval: "1m" },
    });
  });

  it("parses rate() with filters", () => {
    expect(
      parseExpression('rate(http_requests_total{job="api"}[5m])'),
    ).toEqual({
      metric: "http_requests_total",
      filters: [{ label: "job", op: "=", value: "api" }],
      rate: { kind: "rate", interval: "5m" },
    });
  });

  it("parses bare aggregation (no modifier)", () => {
    expect(parseExpression("sum(up)")).toEqual({
      metric: "up",
      filters: [],
      aggregation: { fn: "sum", groupKind: "none", groupLabels: [] },
    });
  });

  it("parses aggregation with 'by' modifier", () => {
    expect(parseExpression("sum(up) by (job)")).toEqual({
      metric: "up",
      filters: [],
      aggregation: { fn: "sum", groupKind: "by", groupLabels: ["job"] },
    });
  });

  it("parses aggregation with 'without' modifier and multiple labels", () => {
    expect(
      parseExpression("avg(up) without (instance, pod)"),
    ).toEqual({
      metric: "up",
      filters: [],
      aggregation: {
        fn: "avg",
        groupKind: "without",
        groupLabels: ["instance", "pod"],
      },
    });
  });

  it("parses full composition: aggregation + rate + filters + by", () => {
    expect(
      parseExpression(
        'sum(rate(http_requests_total{job="api"}[5m])) by (method)',
      ),
    ).toEqual({
      metric: "http_requests_total",
      filters: [{ label: "job", op: "=", value: "api" }],
      rate: { kind: "rate", interval: "5m" },
      aggregation: { fn: "sum", groupKind: "by", groupLabels: ["method"] },
    });
  });

  // Rejections
  it("returns null for filters-only expression (no metric name)", () => {
    expect(parseExpression('{job="api"}')).toBeNull();
  });

  it("returns null for binary operators", () => {
    expect(parseExpression("up + 1")).toBeNull();
    expect(parseExpression("rate(up[5m]) / 2")).toBeNull();
  });

  it("returns null for unsupported aggregation functions", () => {
    expect(parseExpression("topk(5, up)")).toBeNull();
    expect(parseExpression("bottomk(3, up)")).toBeNull();
    expect(parseExpression("quantile(0.9, up)")).toBeNull();
  });

  it("returns null for non-rate/irate function wraps", () => {
    expect(parseExpression("floor(up)")).toBeNull();
    expect(parseExpression("increase(up[5m])")).toBeNull();
  });

  it("returns null for nested aggregation", () => {
    expect(parseExpression("sum(sum(up))")).toBeNull();
  });

  it("returns null for offset modifier", () => {
    expect(parseExpression("up offset 5m")).toBeNull();
  });

  // Round-trip property
  it("round-trips: buildExpression ∘ parseExpression = identity on builder image", () => {
    const states: BuilderState[] = [
      { metric: "up", filters: [] },
      {
        metric: "up",
        filters: [{ label: "job", op: "=", value: "prom" }],
      },
      {
        metric: "http_requests_total",
        filters: [
          { label: "method", op: "!=", value: "GET" },
          { label: "status", op: "=~", value: "2.." },
        ],
      },
      {
        metric: "up",
        filters: [],
        rate: { kind: "rate", interval: "5m" },
      },
      {
        metric: "up",
        filters: [],
        aggregation: { fn: "avg", groupKind: "without", groupLabels: ["pod"] },
      },
      {
        metric: "http_requests_total",
        filters: [{ label: "job", op: "=", value: "api" }],
        rate: { kind: "rate", interval: "5m" },
        aggregation: { fn: "sum", groupKind: "by", groupLabels: ["method"] },
      },
    ];
    for (const s of states) {
      const code = buildExpression(s);
      const parsed = parseExpression(code);
      expect(parsed).not.toBeNull();
      expect(buildExpression(parsed!)).toBe(code);
    }
  });
});

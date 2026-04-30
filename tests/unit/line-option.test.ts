import { describe, it, expect } from "vitest";
import { buildLineOption } from "@/widgets/promql/line-option";
import type { PromRangeResponse } from "@/server/schemas/prometheus";

const twoSeriesResp: PromRangeResponse = {
  status: "success",
  data: {
    resultType: "matrix",
    result: [
      {
        metric: { __name__: "up", job: "prometheus", instance: "localhost:9090" },
        values: [
          [1714348800, "1"],
          [1714348815, "1"],
        ],
      },
      {
        metric: { __name__: "up", job: "worker", instance: "host-2:9100" },
        values: [
          [1714348800, "0"],
          [1714348815, "1"],
        ],
      },
    ],
  },
};

describe("buildLineOption", () => {
  it("returns an option with one series per matrix entry", () => {
    const opt = buildLineOption(twoSeriesResp) as { series: unknown[] };
    expect(opt.series).toHaveLength(2);
  });

  it("builds Grafana-style series names from the metric labels", () => {
    const opt = buildLineOption(twoSeriesResp) as {
      series: Array<{ name: string }>;
    };
    expect(opt.series[0]?.name).toBe(
      'up{job="prometheus", instance="localhost:9090"}',
    );
    expect(opt.series[1]?.name).toBe(
      'up{job="worker", instance="host-2:9100"}',
    );
  });

  it("converts unix seconds to milliseconds and values to numbers", () => {
    const opt = buildLineOption(twoSeriesResp) as {
      series: Array<{ data: readonly [number, number | null][] }>;
    };
    expect(opt.series[0]?.data[0]).toEqual([1714348800_000, 1]);
    expect(opt.series[1]?.data[0]).toEqual([1714348800_000, 0]);
  });

  it("maps 'NaN' / '+Inf' / '-Inf' / invalid numbers to null", () => {
    const resp: PromRangeResponse = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [
          {
            metric: { __name__: "edge" },
            values: [
              [1, "1.5"],
              [2, "NaN"],
              [3, "+Inf"],
              [4, "-Inf"],
              [5, "not-a-number"],
            ],
          },
        ],
      },
    };
    const opt = buildLineOption(resp) as {
      series: Array<{ data: readonly [number, number | null][] }>;
    };
    const vals = opt.series[0]!.data.map(([, v]) => v);
    expect(vals).toEqual([1.5, null, null, null, null]);
  });

  it("uses 'series' as fallback when no __name__ and no other labels", () => {
    const resp: PromRangeResponse = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [{ metric: {}, values: [[1, "1"]] }],
      },
    };
    const opt = buildLineOption(resp) as { series: Array<{ name: string }> };
    expect(opt.series[0]?.name).toBe("series");
  });

  it("uses bare __name__ when no other labels are present", () => {
    const resp: PromRangeResponse = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [{ metric: { __name__: "foo" }, values: [[1, "1"]] }],
      },
    };
    const opt = buildLineOption(resp) as { series: Array<{ name: string }> };
    expect(opt.series[0]?.name).toBe("foo");
  });

  it("sets xAxis.type to 'time' and yAxis.type to 'value'", () => {
    const opt = buildLineOption(twoSeriesResp) as {
      xAxis: { type: string };
      yAxis: { type: string };
    };
    expect(opt.xAxis.type).toBe("time");
    expect(opt.yAxis.type).toBe("value");
  });
});

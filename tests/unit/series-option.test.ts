import { describe, it, expect } from "vitest";
import { buildSeriesOption } from "@/widgets/promql/series-option";
import type { PromRangeResponse } from "@/server/schemas/prometheus";

const twoSeriesResp: PromRangeResponse = {
  status: "success",
  data: {
    resultType: "matrix",
    result: [
      {
        metric: { __name__: "up", job: "prometheus" },
        values: [
          [1714348800, "1"],
          [1714348815, "1"],
        ],
      },
      {
        metric: { __name__: "up", job: "worker" },
        values: [
          [1714348800, "0"],
          [1714348815, "1"],
        ],
      },
    ],
  },
};

describe("buildSeriesOption", () => {
  it("line: series type 'line', smooth:true, no areaStyle, no stack", () => {
    const opt = buildSeriesOption(twoSeriesResp, "line") as {
      series: Array<{
        type: string;
        smooth?: boolean;
        areaStyle?: unknown;
        stack?: string;
      }>;
    };
    expect(opt.series[0]?.type).toBe("line");
    expect(opt.series[0]?.smooth).toBe(true);
    expect(opt.series[0]?.areaStyle).toBeUndefined();
    expect(opt.series[0]?.stack).toBeUndefined();
  });

  it("area: series type 'line', areaStyle is present", () => {
    const opt = buildSeriesOption(twoSeriesResp, "area") as {
      series: Array<{ type: string; areaStyle?: unknown }>;
    };
    expect(opt.series[0]?.type).toBe("line");
    expect(opt.series[0]?.areaStyle).toEqual({});
  });

  it("bar: series type 'bar', no stack", () => {
    const opt = buildSeriesOption(twoSeriesResp, "bar") as {
      series: Array<{ type: string; stack?: string }>;
    };
    expect(opt.series[0]?.type).toBe("bar");
    expect(opt.series[0]?.stack).toBeUndefined();
  });

  it("stacked-bar: series type 'bar', stack 'total'", () => {
    const opt = buildSeriesOption(twoSeriesResp, "stacked-bar") as {
      series: Array<{ type: string; stack?: string }>;
    };
    expect(opt.series[0]?.type).toBe("bar");
    expect(opt.series[0]?.stack).toBe("total");
  });

  it("scatter: series type 'scatter', symbolSize 6", () => {
    const opt = buildSeriesOption(twoSeriesResp, "scatter") as {
      series: Array<{ type: string; symbolSize?: number }>;
    };
    expect(opt.series[0]?.type).toBe("scatter");
    expect(opt.series[0]?.symbolSize).toBe(6);
  });

  it("sets xAxis.type 'time' and yAxis.type 'value' across all types", () => {
    for (const st of ["line", "area", "bar", "stacked-bar", "scatter"] as const) {
      const opt = buildSeriesOption(twoSeriesResp, st) as {
        xAxis: { type: string };
        yAxis: { type: string };
      };
      expect(opt.xAxis.type).toBe("time");
      expect(opt.yAxis.type).toBe("value");
    }
  });

  it("labels series Grafana-style and converts seconds→ms, non-finite→null", () => {
    const resp: PromRangeResponse = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [
          {
            metric: { __name__: "foo", label: "x" },
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
    const opt = buildSeriesOption(resp, "line") as {
      series: Array<{ name: string; data: Array<readonly [number, number | null]> }>;
    };
    expect(opt.series[0]?.name).toBe('foo{label="x"}');
    expect(opt.series[0]?.data.map(([t, v]) => [t, v])).toEqual([
      [1_000, 1.5],
      [2_000, null],
      [3_000, null],
      [4_000, null],
      [5_000, null],
    ]);
  });
});

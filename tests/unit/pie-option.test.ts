import { describe, it, expect } from "vitest";
import { buildPieOption } from "@/widgets/promql/pie-option";
import type { PromInstantResponse } from "@/server/schemas/prometheus";

const resp: PromInstantResponse = {
  status: "success",
  data: {
    resultType: "vector",
    result: [
      { metric: { __name__: "up", job: "prometheus" }, value: [1, "3"] },
      { metric: { __name__: "up", job: "worker" }, value: [1, "5"] },
      { metric: { __name__: "up", job: "other" }, value: [1, "NaN"] },
    ],
  },
};

describe("buildPieOption", () => {
  it("maps each result to a slice with name + value", () => {
    const opt = buildPieOption(resp, "60%") as {
      series: Array<{ radius: string; data: Array<{ name: string; value: number }> }>;
    };
    expect(opt.series[0]?.data).toHaveLength(3);
    expect(opt.series[0]?.data[0]?.name).toBe('up{job="prometheus"}');
    expect(opt.series[0]?.data[0]?.value).toBe(3);
    expect(opt.series[0]?.data[1]?.value).toBe(5);
  });

  it("coerces NaN / non-finite values to 0", () => {
    const opt = buildPieOption(resp, "60%") as {
      series: Array<{ data: Array<{ value: number }> }>;
    };
    expect(opt.series[0]?.data[2]?.value).toBe(0);
  });

  it("accepts radius as a string (pie)", () => {
    const opt = buildPieOption(resp, "60%") as {
      series: Array<{ radius: string | [string, string] }>;
    };
    expect(opt.series[0]?.radius).toBe("60%");
  });

  it("accepts radius as a tuple (donut)", () => {
    const opt = buildPieOption(resp, ["40%", "70%"]) as {
      series: Array<{ radius: string | [string, string] }>;
    };
    expect(opt.series[0]?.radius).toEqual(["40%", "70%"]);
  });
});

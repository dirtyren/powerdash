import { describe, it, expect } from "vitest";
import {
  PromRangeResponseSchema,
  PromInstantResponseSchema,
  PromErrorResponseSchema,
} from "@/server/schemas/prometheus";

describe("Prometheus schemas", () => {
  it("parses a valid range matrix response", () => {
    const raw = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [
          {
            metric: { __name__: "up", instance: "localhost:9090", job: "prometheus" },
            values: [
              [1714348800, "1"],
              [1714348815, "1"],
            ],
          },
        ],
      },
    };
    const parsed = PromRangeResponseSchema.parse(raw);
    expect(parsed.data.result).toHaveLength(1);
    expect(parsed.data.result[0]?.values[0]).toEqual([1714348800, "1"]);
  });

  it("parses a valid instant vector response", () => {
    const raw = {
      status: "success",
      data: {
        resultType: "vector",
        result: [
          {
            metric: { __name__: "up", job: "prometheus" },
            value: [1714348800, "1"],
          },
        ],
      },
    };
    const parsed = PromInstantResponseSchema.parse(raw);
    expect(parsed.data.result[0]?.value[1]).toBe("1");
  });

  it("parses an error response", () => {
    const raw = {
      status: "error",
      errorType: "bad_data",
      error: "invalid parameter 'query': 1:1: parse error: no expression found in input",
    };
    const parsed = PromErrorResponseSchema.parse(raw);
    expect(parsed.errorType).toBe("bad_data");
  });

  it("rejects a malformed response (wrong resultType)", () => {
    const raw = {
      status: "success",
      data: { resultType: "scalar", result: [1714348800, "1"] },
    };
    expect(() => PromRangeResponseSchema.parse(raw)).toThrow();
  });

  it("rejects a response missing the status field", () => {
    expect(() => PromRangeResponseSchema.parse({ data: {} })).toThrow();
  });
});

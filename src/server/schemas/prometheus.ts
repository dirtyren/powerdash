import { z } from "zod";

// Prometheus sample: [unix_seconds_float, value_as_string]
// Values are strings because JSON can't losslessly encode "+Inf", "-Inf", "NaN".
export const PromSampleSchema = z.tuple([z.number(), z.string()]);
export type PromSample = z.infer<typeof PromSampleSchema>;

export const PromMatrixResultSchema = z.object({
  metric: z.record(z.string()),
  values: z.array(PromSampleSchema),
});
export type PromMatrixResult = z.infer<typeof PromMatrixResultSchema>;

export const PromVectorResultSchema = z.object({
  metric: z.record(z.string()),
  value: PromSampleSchema,
});
export type PromVectorResult = z.infer<typeof PromVectorResultSchema>;

export const PromRangeResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    resultType: z.literal("matrix"),
    result: z.array(PromMatrixResultSchema),
  }),
});
export type PromRangeResponse = z.infer<typeof PromRangeResponseSchema>;

export const PromInstantResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    resultType: z.literal("vector"),
    result: z.array(PromVectorResultSchema),
  }),
});
export type PromInstantResponse = z.infer<typeof PromInstantResponseSchema>;

export const PromErrorResponseSchema = z.object({
  status: z.literal("error"),
  errorType: z.string(),
  error: z.string(),
});
export type PromErrorResponse = z.infer<typeof PromErrorResponseSchema>;

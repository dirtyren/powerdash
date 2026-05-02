import { NextResponse } from "next/server";
import { callPrometheus, PrometheusError } from "@/server/prometheus/client";
import {
  PromLabelValuesResponseSchema,
  PromErrorResponseSchema,
} from "@/server/schemas/prometheus";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name } = await ctx.params;
  try {
    const raw = await callPrometheus(
      `/api/v1/label/${encodeURIComponent(name)}/values`,
      new URLSearchParams(),
    );

    const errCheck = PromErrorResponseSchema.safeParse(raw);
    if (errCheck.success) {
      return NextResponse.json(
        {
          error: "promql",
          errorType: errCheck.data.errorType,
          message: errCheck.data.error,
        },
        { status: 502 },
      );
    }

    const parsed = PromLabelValuesResponseSchema.parse(raw);
    return NextResponse.json(parsed, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof PrometheusError) {
      return NextResponse.json(
        { error: "upstream", status: err.status, message: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { callPrometheus, PrometheusError } from "@/server/prometheus/client";
import {
  PromRangeResponseSchema,
  PromErrorResponseSchema,
} from "@/server/schemas/prometheus";

const BodySchema = z.object({
  expr: z.string().min(1),
  start: z.number().optional(),
  end: z.number().optional(),
  step: z.number().positive().optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    const raw: unknown = await req.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_body", message: err instanceof Error ? err.message : String(err) },
      { status: 422 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const start = body.start ?? now - 3600;
  const end = body.end ?? now;
  const step = body.step ?? 15;

  const params = new URLSearchParams({
    query: body.expr,
    start: String(start),
    end: String(end),
    step: String(step),
  });

  try {
    const raw = await callPrometheus("/api/v1/query_range", params);

    const errCheck = PromErrorResponseSchema.safeParse(raw);
    if (errCheck.success) {
      return NextResponse.json(
        { error: "promql", errorType: errCheck.data.errorType, message: errCheck.data.error },
        { status: 502 },
      );
    }

    const parsed = PromRangeResponseSchema.parse(raw);
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

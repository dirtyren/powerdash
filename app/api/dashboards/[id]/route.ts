import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboard, saveDashboard } from "@/server/seagull/dashboards";
import { SeagullError, SaveDashboardError } from "@/server/seagull/client";
import { WidgetRefSchema } from "@/server/schemas/widget";
import { SAVE_ERROR_HTTP } from "@/server/seagull/error-mapping";

const PutBodySchema = z.object({
  widgets: z.array(WidgetRefSchema),
  name: z.string().trim().min(1).optional(),
});

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let parsedBody: z.infer<typeof PutBodySchema>;
  try {
    const raw: unknown = await req.json();
    parsedBody = PutBodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_body",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 422 },
    );
  }

  try {
    const existing = await getDashboard(id);
    const saved = await saveDashboard({
      ...existing,
      widgets: parsedBody.widgets,
      ...(parsedBody.name !== undefined ? { name: parsedBody.name } : {}),
    });
    return NextResponse.json(saved, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof SaveDashboardError) {
      const status = SAVE_ERROR_HTTP[err.code] ?? 500;
      return NextResponse.json(
        { error: "save_failed", code: err.code, message: err.message },
        { status },
      );
    }
    if (err instanceof SeagullError) {
      return NextResponse.json(
        { error: "upstream", status: err.status, message: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        error: "internal",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const data = await getDashboard(id);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof SeagullError && err.status === 404) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (err instanceof SeagullError) {
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

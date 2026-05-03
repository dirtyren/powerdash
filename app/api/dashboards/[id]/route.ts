import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getDashboard,
  updateDashboard,
} from "@/server/db/dashboards";
import { WidgetRefSchema } from "@/server/schemas/widget";

const PutBodySchema = z.object({
  widgets: z.array(WidgetRefSchema),
  name: z.string().trim().min(1).optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const d = await getDashboard(id);
    if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(d, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let parsed;
  try {
    const raw: unknown = await req.json();
    parsed = PutBodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_body", message: err instanceof Error ? err.message : String(err) },
      { status: 422 },
    );
  }

  try {
    const saved = await updateDashboard(id, {
      widgets: parsed.widgets,
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.width !== undefined ? { width: parsed.width } : {}),
      ...(parsed.height !== undefined ? { height: parsed.height } : {}),
    });
    if (!saved) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(saved, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

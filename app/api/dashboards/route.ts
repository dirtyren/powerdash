import { NextResponse } from "next/server";
import { z } from "zod";
import { listDashboards, saveDashboard } from "@/server/seagull/dashboards";
import { SeagullError, SaveDashboardError } from "@/server/seagull/client";
import { CreateDashboardSchema } from "@/server/schemas/dashboard";
import { SAVE_ERROR_HTTP } from "@/server/seagull/error-mapping";

export async function GET() {
  try {
    const data = await listDashboards();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
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

export async function POST(req: Request) {
  let parsed: z.infer<typeof CreateDashboardSchema>;
  try {
    const raw: unknown = await req.json();
    parsed = CreateDashboardSchema.parse(raw);
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
    const saved = await saveDashboard(parsed);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
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
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

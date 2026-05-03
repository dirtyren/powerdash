import { NextResponse } from "next/server";
import {
  listDashboards,
  createDashboard,
} from "@/server/db/dashboards";
import { CreateDashboardSchema } from "@/server/schemas/dashboard";

export async function GET() {
  try {
    const data = await listDashboards();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let parsed;
  try {
    const raw: unknown = await req.json();
    parsed = CreateDashboardSchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_body", message: err instanceof Error ? err.message : String(err) },
      { status: 422 },
    );
  }

  try {
    const saved = await createDashboard(parsed);
    return NextResponse.json(saved, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

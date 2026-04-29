import { NextResponse } from "next/server";
import { listDashboards } from "@/server/seagull/dashboards";
import { SeagullError } from "@/server/seagull/client";

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

import { NextResponse } from "next/server";
import { getDashboard } from "@/server/seagull/dashboards";
import { SeagullError } from "@/server/seagull/client";

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

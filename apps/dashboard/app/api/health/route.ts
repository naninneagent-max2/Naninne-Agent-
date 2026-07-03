import { NextResponse } from "next/server";
import { sbSelect } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    const result = await sbSelect("projects", { select: "id", limit: "1" });
    dbOk = Array.isArray(result);
  } catch {}

  return NextResponse.json({
    status: dbOk ? "ok" : "degraded",
    version: "2d-files",
    db: dbOk ? "connected" : "disconnected",
    ai: process.env.OPENAI_API_KEY ? "configured" : "not configured",
    timestamp: new Date().toISOString(),
  });
}

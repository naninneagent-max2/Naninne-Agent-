import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { createServiceClient } from "../../../lib/supabase";

// GET /api/jobs — List jobs from the queue
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");

  const sb = createServiceClient();

  let query = sb
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

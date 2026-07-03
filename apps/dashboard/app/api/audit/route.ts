import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { createServiceClient } from "../../../lib/supabase";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "7d";
  const sb = createServiceClient();

  let since = new Date();
  if (period === "24h") since.setDate(since.getDate() - 1);
  else if (period === "7d") since.setDate(since.getDate() - 7);
  else since.setDate(since.getDate() - 30);

  const { data } = await sb
    .from("audit_logs")
    .select("*")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json(data ?? []);
}

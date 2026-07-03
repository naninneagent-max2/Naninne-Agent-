import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { createServiceClient } from "../../../../lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createServiceClient();
  const { data } = await sb.from("vercel_deployments").select("*").order("created_at", { ascending: false }).limit(20);
  return NextResponse.json(data ?? []);
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { createServiceClient } from "../../../lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createServiceClient();
  const { data } = await sb.from("approvals").select("*").order("created_at", { ascending: false }).limit(100);
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action } = await req.json();
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Missing id or invalid action" }, { status: 400 });
  }

  const sb = createServiceClient();
  const status = action === "approve" ? "approved" : "rejected";

  const { data, error } = await sb
    .from("approvals")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // If approved, enqueue the tool execution job
  if (status === "approved" && data.tool_name) {
    await sb.from("jobs").insert({
      type: "execute_tool",
      input: { tool_name: data.tool_name, tool_input: data.tool_input ?? {}, approval_id: id },
      status: "queued",
      priority: 8,
    });
  }

  return NextResponse.json(data);
}

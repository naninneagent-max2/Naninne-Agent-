import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { createServiceClient } from "../../../lib/supabase";

// GET /api/memories
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createServiceClient();
  const { data } = await sb.from("memories").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(100);
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("memories")
    .insert({
      user_id: user.sub,
      type: body.type ?? "operational",
      content: body.content,
      importance: body.importance ?? 5,
      is_active: true,
      metadata: { tags: body.tags ?? [], source: "dashboard" },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb = createServiceClient();
  await sb.from("memories").update({ is_active: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}

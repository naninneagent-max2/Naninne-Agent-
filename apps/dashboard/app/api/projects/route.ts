import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { createServiceClient } from "../../../lib/supabase";

// GET /api/projects
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createServiceClient();
  const { data: projects } = await sb.from("projects").select("*").order("name");

  // Enrich with task counts
  const enriched = await Promise.all((projects ?? []).map(async (p: { id: string }) => {
    const { count } = await sb.from("tasks").select("*", { count: "exact", head: true }).eq("project_id", p.id);
    return { ...p, task_count: count ?? 0 };
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("projects")
    .insert({ name: body.name, description: body.description })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb = createServiceClient();
  const { data, error } = await sb.from("projects").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

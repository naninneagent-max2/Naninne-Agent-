import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { createServiceClient } from "../../../lib/supabase";
import { createTask } from "../../../lib/tasks/create-task";

// GET /api/tasks — list tasks (or jobs if type=jobs)
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const sb = createServiceClient();

  if (url.searchParams.get("type") === "jobs") {
    const { data } = await sb.from("jobs").select("*").order("created_at", { ascending: false }).limit(100);
    return NextResponse.json(data ?? []);
  }

  const { data } = await sb.from("tasks").select("*, project:projects(name)").order("created_at", { ascending: false }).limit(200);
  return NextResponse.json(data ?? []);
}

// POST /api/tasks — create task
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sb = createServiceClient();
  const result = await createTask(sb, {
    userId: user.sub,
    title: body.title,
    description: body.description,
    priority: body.priority,
    projectId: body.project_id,
    source: "dashboard",
  });

  if (result.error && !result.task.id) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

// PATCH /api/tasks — update task (id in body)
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE /api/tasks — delete task (id in query)
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb = createServiceClient();
  await sb.from("tasks").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}

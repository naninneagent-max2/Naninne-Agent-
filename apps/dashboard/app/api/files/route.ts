import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { createServiceClient } from "../../../lib/supabase";
import { refreshSignedUrl } from "../../../lib/files/upload-service";

// GET /api/files — List with filters + pagination
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const origin = url.searchParams.get("origin");
  const category = url.searchParams.get("category");
  const projectId = url.searchParams.get("project_id");
  const search = url.searchParams.get("search");
  const period = url.searchParams.get("period");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const id = url.searchParams.get("id");

  const sb = createServiceClient();

  // Single file detail
  if (id) {
    const { data: file } = await sb.from("files").select("*").eq("id", id).single();
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Refresh signed URL if expired
    if (file.signed_url_expires_at && new Date(file.signed_url_expires_at) < new Date()) {
      const refreshed = await refreshSignedUrl(file.id);
      if (refreshed) {
        file.signed_url = refreshed.signed_url;
        file.signed_url_expires_at = refreshed.signed_url_expires_at;
      }
    }
    return NextResponse.json(file);
  }

  // Build query
  let query = sb
    .from("files")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (origin) query = query.eq("origin", origin);
  if (category) query = query.eq("category", category);
  if (projectId) query = query.eq("project_id", projectId);
  if (search) query = query.ilike("original_name", `%${search}%`);

  if (period) {
    const now = new Date();
    let since: Date;
    switch (period) {
      case "24h":
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        since = new Date(0);
    }
    query = query.gte("created_at", since.toISOString());
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Calculate total size
  const totalSize = (data ?? []).reduce((acc, f) => acc + (f.size_bytes || 0), 0);

  return NextResponse.json({
    files: data ?? [],
    total: count ?? 0,
    total_size: totalSize,
    limit,
    offset,
  });
}

// PATCH /api/files — Update tags/category/project_id
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, tags, category, project_id } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb = createServiceClient();

  const updates: Record<string, unknown> = {};
  if (tags !== undefined) updates.tags = tags;
  if (category !== undefined) updates.category = category;
  if (project_id !== undefined) updates.project_id = project_id || null;

  const { data, error } = await sb
    .from("files")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE /api/files — Remove from storage + DB
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb = createServiceClient();

  // Get file record first
  const { data: file } = await sb.from("files").select("storage_path, storage_bucket").eq("id", id).single();

  // Delete from storage
  if (file?.storage_path) {
    const bucket = file.storage_bucket || "arquivos-naninne";
    await sb.storage.from(bucket).remove([file.storage_path]).catch(() => {});
  }

  // Delete from DB
  const { error } = await sb.from("files").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

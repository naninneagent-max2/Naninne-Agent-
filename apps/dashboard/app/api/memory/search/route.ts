import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { createServiceClient } from "../../../../lib/supabase";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ results: [] });

  // Get embedding
  const embRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: query.slice(0, 8000) }),
  });

  if (!embRes.ok) return NextResponse.json({ results: [] });
  const embData = await embRes.json();
  const embedding = embData.data?.[0]?.embedding ?? [];
  if (!embedding.length) return NextResponse.json({ results: [] });

  const sb = createServiceClient();
  const { data } = await sb.rpc("search_memories", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 20,
    filter_project_id: null,
  });

  return NextResponse.json({ results: data ?? [] });
}

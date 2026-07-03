import { SupabaseClient } from "@supabase/supabase-js";

// ================================================================
// Handler: background_memory
// Payload: { user_id, content, tags?, type? }
// ================================================================

interface Payload {
  user_id: string;
  content: string;
  tags?: string[];
  type?: string;
}

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.[0]?.embedding ?? [];
  } catch {
    return [];
  }
}

export async function run(
  raw: Record<string, unknown>,
  ctx: { sb: SupabaseClient }
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const user_id = raw.user_id as string;
  const content = raw.content as string;
  const tags = raw.tags as string[] | undefined;
  const type = raw.type as string | undefined;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!content?.trim()) {
    return { ok: false, error: "Empty content" };
  }

  // 1. Insert memory
  const { data: memory, error: memError } = await ctx.sb
    .from("memories")
    .insert({
      user_id,
      type: type ?? "operational",
      content: content.trim(),
      importance: 5,
      is_active: true,
      metadata: { tags: tags ?? [], source: "worker" },
    })
    .select("id")
    .single();

  if (memError || !memory) {
    return { ok: false, error: `Memory insert failed: ${memError?.message ?? "unknown"}` };
  }

  // 2. Create chunk
  const { data: chunk, error: chunkError } = await ctx.sb
    .from("memory_chunks")
    .insert({
      memory_id: memory.id,
      chunk_index: 0,
      content: content.trim(),
    })
    .select("id")
    .single();

  if (chunkError || !chunk) {
    return { ok: false, error: `Chunk insert failed: ${chunkError?.message ?? "unknown"}` };
  }

  // 3. Generate and store embedding
  if (apiKey) {
    const embedding = await getEmbedding(content.trim(), apiKey);
    if (embedding.length > 0) {
      await ctx.sb.from("memory_embeddings").insert({
        chunk_id: chunk.id,
        embedding: JSON.stringify(embedding),
        model: "text-embedding-3-small",
      });
    }
  }

  return {
    ok: true,
    result: {
      memory_id: memory.id,
      chunk_id: chunk.id,
      has_embedding: !!apiKey,
      tags: tags ?? [],
    },
  };
}

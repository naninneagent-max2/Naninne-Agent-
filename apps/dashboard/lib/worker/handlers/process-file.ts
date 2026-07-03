import { SupabaseClient } from "@supabase/supabase-js";

// ================================================================
// Worker Handler: process_file
// Enriches uploaded files with AI-generated summaries and embeddings
// ================================================================

const BUCKET = "arquivos-naninne";

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

async function processImage(
  sb: SupabaseClient,
  fileId: string,
  signedUrl: string,
  apiKey: string
): Promise<{ summary: string; tags: string[] }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Descreva esta imagem em 1 frase curta em português. Também sugira até 5 tags relevantes. Responda APENAS em JSON: {"summary": "...", "tags": ["tag1", "tag2"]}',
            },
            { type: "image_url", image_url: { url: signedUrl, detail: "low" } },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI Vision error: ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    return {
      summary: parsed.summary || "Imagem sem descrição",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
    };
  } catch {
    return { summary: content.slice(0, 200), tags: [] };
  }
}

async function processDocument(
  sb: SupabaseClient,
  fileId: string,
  storagePath: string,
  apiKey: string
): Promise<{ summary: string; tags: string[] }> {
  // Download the file from storage
  const { data: fileData, error } = await sb.storage.from(BUCKET).download(storagePath);

  if (error || !fileData) {
    throw new Error(`Failed to download file: ${error?.message}`);
  }

  const text = await fileData.text();
  const contentSlice = text.slice(0, 8000);

  if (!contentSlice.trim()) {
    return { summary: "Documento vazio", tags: [] };
  }

  // Generate summary via LLM
  const summaryRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Resuma este documento em 1-2 frases curtas em português e sugira até 5 tags. Responda APENAS em JSON: {"summary": "...", "tags": ["tag1"]}\n\n${contentSlice}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  let summary = "Documento processado";
  let tags: string[] = [];

  if (summaryRes.ok) {
    const data = await summaryRes.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      summary = parsed.summary || summary;
      tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [];
    } catch {
      summary = content.slice(0, 200);
    }
  }

  // Generate embedding and store in memory_chunks
  const embedding = await getEmbedding(contentSlice, apiKey);
  if (embedding.length) {
    const { data: memory } = await sb
      .from("memories")
      .insert({
        type: "semantic",
        content: summary,
        importance: 5,
        is_active: true,
        source: `file:${fileId}`,
        metadata: { file_id: fileId },
      })
      .select("id")
      .single();

    if (memory) {
      const { data: chunk } = await sb
        .from("memory_chunks")
        .insert({
          memory_id: memory.id,
          chunk_index: 0,
          content: contentSlice,
        })
        .select("id")
        .single();

      if (chunk) {
        await sb.from("memory_embeddings").insert({
          chunk_id: chunk.id,
          embedding: JSON.stringify(embedding),
          model: "text-embedding-3-small",
        });
      }
    }
  }

  return { summary, tags };
}

export async function run(
  payload: Record<string, unknown>,
  ctx: { sb: SupabaseClient }
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const fileId = payload.file_id as string;
  if (!fileId) return { ok: false, error: "Missing file_id" };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY not configured" };

  const { sb } = ctx;

  // Get file record
  const { data: file, error: fetchError } = await sb
    .from("files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (fetchError || !file) {
    return { ok: false, error: `File not found: ${fetchError?.message}` };
  }

  // Mark as processing
  await sb.from("files").update({ processing_status: "processing" }).eq("id", fileId);

  try {
    const category = file.category || "outros";
    let summary = file.summary || "";
    let tags: string[] = file.tags || [];

    if (category === "imagens" && file.signed_url) {
      const result = await processImage(sb, fileId, file.signed_url, apiKey);
      summary = result.summary;
      tags = [...new Set([...tags, ...result.tags])];
    } else if (category === "documentos" && file.storage_path) {
      const result = await processDocument(sb, fileId, file.storage_path, apiKey);
      summary = result.summary;
      tags = [...new Set([...tags, ...result.tags])];
    }
    // Audio/video: skip for now

    // Update file with enriched data
    await sb
      .from("files")
      .update({
        processing_status: "done",
        summary,
        tags,
        category,
      })
      .eq("id", fileId);

    return { ok: true, result: { file_id: fileId, summary, tags } };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);

    await sb
      .from("files")
      .update({ processing_status: "failed", metadata: { ...(file.metadata || {}), process_error: errMsg } })
      .eq("id", fileId);

    return { ok: false, error: errMsg };
  }
}

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { MemoryType, RelevantMemory } from "./types.js";

// ================================================================
// GERENCIADOR DE MEMÓRIA — 8 tipos de memória
// ================================================================

export class MemoryManager {
  private supabase: SupabaseClient;
  private embeddingModel: ReturnType<typeof createGoogleGenerativeAI>[string] | ReturnType<typeof createOpenAI>[string];

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const provider = process.env.AI_PROVIDER ?? "google";
    if (provider === "openai") {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.embeddingModel = openai.embedding("text-embedding-3-small");
    } else {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      this.embeddingModel = google.textEmbeddingModel("text-embedding-004");
    }
  }

  // ----------------------------------------------------------------
  // Salvar nova memória
  // ----------------------------------------------------------------
  async remember(params: {
    content: string;
    type: MemoryType;
    userId?: string;
    projectId?: string;
    key?: string;
    importance?: number;
    source?: string;
    expiresAt?: Date;
  }): Promise<string> {
    const { data: memory, error: memoryError } = await this.supabase
      .from("memories")
      .insert({
        user_id: params.userId,
        project_id: params.projectId,
        type: params.type,
        key: params.key,
        content: params.content,
        importance: params.importance ?? 5,
        source: params.source,
        expires_at: params.expiresAt?.toISOString(),
      })
      .select("id")
      .single();

    if (memoryError) throw memoryError;

    // Criar chunk e embedding
    const { data: chunk, error: chunkError } = await this.supabase
      .from("memory_chunks")
      .insert({
        memory_id: memory.id,
        chunk_index: 0,
        content: params.content,
      })
      .select("id")
      .single();

    if (chunkError) throw chunkError;

    // Gerar embedding
    try {
      const { embedding } = await embed({
        model: this.embeddingModel as Parameters<typeof embed>[0]["model"],
        value: params.content,
      });

      await this.supabase.from("memory_embeddings").insert({
        chunk_id: chunk.id,
        embedding: JSON.stringify(embedding),
        model: process.env.AI_PROVIDER === "openai" ? "text-embedding-3-small" : "text-embedding-004",
      });
    } catch (embeddingError) {
      console.warn("Embedding falhou, memória salva sem vetor:", embeddingError);
    }

    return memory.id;
  }

  // ----------------------------------------------------------------
  // Busca semântica de memórias relevantes
  // ----------------------------------------------------------------
  async recall(params: {
    query: string;
    projectId?: string;
    types?: MemoryType[];
    limit?: number;
    threshold?: number;
  }): Promise<RelevantMemory[]> {
    try {
      const { embedding } = await embed({
        model: this.embeddingModel as Parameters<typeof embed>[0]["model"],
        value: params.query,
      });

      const { data, error } = await this.supabase.rpc("search_memories", {
        query_embedding: JSON.stringify(embedding),
        match_threshold: params.threshold ?? 0.6,
        match_count: params.limit ?? 10,
        filter_project_id: params.projectId ?? null,
      });

      if (error) throw error;

      return (data ?? []).map((row: {
        memory_id: string;
        chunk_id: string;
        content: string;
        similarity: number;
        memory_type: string;
        project_id: string;
      }) => ({
        memoryId: row.memory_id,
        content: row.content,
        type: row.memory_type as MemoryType,
        similarity: row.similarity,
        projectId: row.project_id,
      }));
    } catch {
      // Fallback: busca por texto simples se embedding falhar
      return this.recallByText(params.query, params.limit ?? 10);
    }
  }

  // ----------------------------------------------------------------
  // Busca por texto simples (fallback)
  // ----------------------------------------------------------------
  private async recallByText(query: string, limit: number): Promise<RelevantMemory[]> {
    const { data, error } = await this.supabase
      .from("memories")
      .select(`
        id,
        content,
        type,
        project_id,
        memory_chunks(id, content)
      `)
      .textSearch("content", query, { type: "websearch" })
      .eq("is_active", true)
      .limit(limit);

    if (error || !data) return [];

    return data.map((m: {
      id: string;
      content: string;
      type: string;
      project_id: string;
    }) => ({
      memoryId: m.id,
      content: m.content,
      type: m.type as MemoryType,
      similarity: 0.5,
      projectId: m.project_id,
    }));
  }

  // ----------------------------------------------------------------
  // Atualizar memória existente
  // ----------------------------------------------------------------
  async update(memoryId: string, content: string): Promise<void> {
    await this.supabase
      .from("memories")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", memoryId);
  }

  // ----------------------------------------------------------------
  // Desativar memória (não apagar)
  // ----------------------------------------------------------------
  async forget(memoryId: string): Promise<void> {
    await this.supabase
      .from("memories")
      .update({ is_active: false })
      .eq("id", memoryId);
  }

  // ----------------------------------------------------------------
  // Listar memórias por tipo e projeto
  // ----------------------------------------------------------------
  async list(params: {
    type?: MemoryType;
    projectId?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    content: string;
    type: MemoryType;
    importance: number;
    createdAt: string;
  }>> {
    let query = this.supabase
      .from("memories")
      .select("id, content, type, importance, created_at")
      .eq("is_active", true)
      .order("importance", { ascending: false })
      .limit(params.limit ?? 50);

    if (params.type) query = query.eq("type", params.type);
    if (params.projectId) query = query.eq("project_id", params.projectId);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((m: {
      id: string;
      content: string;
      type: string;
      importance: number;
      created_at: string;
    }) => ({
      id: m.id,
      content: m.content,
      type: m.type as MemoryType,
      importance: m.importance,
      createdAt: m.created_at,
    }));
  }
}

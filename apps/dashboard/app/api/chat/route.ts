import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { sbSelect, sbInsert, sbRpc } from "../../../lib/supabase";
import { getCurrentUser } from "../../../lib/auth";

export const maxDuration = 30;

const SYSTEM_PROMPT = `Você é Hermes, o Agente Maestro do Mundo Roberth Agent OS.

## Identidade
Assistente pessoal e profissional do Roberth. Gerencia um ecossistema de agentes especializados.

## Projetos Ativos
- RC Agropecuária (campanhas, leilões, conteúdo agro)
- Villa Canabrava (imóveis, marketing)
- Hermes Agent OS (desenvolvimento técnico)
- Casa de Memória e Futuro (cultural/pessoal)
- Mundo Roberth (marca pessoal)

## Regras
1. Sempre responda em português do Brasil
2. Seja direto, preciso e acionável
3. Use markdown quando útil
4. Para ações de risco alto, peça confirmação
5. Nunca exponha segredos ou credenciais
6. Se o usuário mencionar info pessoal, diga que está registrando na memória`;

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

async function recallMemories(query: string, apiKey: string) {
  const embedding = await getEmbedding(query, apiKey);
  if (!embedding.length) return [];
  try {
    return await sbRpc("search_memories", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.5,
      match_count: 5,
      filter_project_id: null,
    });
  } catch {
    return [];
  }
}

async function shouldRemember(message: string): Promise<boolean> {
  const keywords = ["meu nome", "eu sou", "minha empresa", "lembr", "anot", "registr", "salv", "não esquec"];
  return keywords.some((k) => message.toLowerCase().includes(k));
}

async function saveMemory(content: string, userId: string, apiKey: string) {
  const memory = await sbInsert("memories", {
    user_id: userId,
    type: "profile",
    content,
    importance: 7,
    is_active: true,
  });
  if (!memory) return;
  const embedding = await getEmbedding(content, apiKey);
  const chunk = await sbInsert("memory_chunks", {
    memory_id: memory.id,
    chunk_index: 0,
    content,
  });
  if (chunk && embedding.length) {
    await sbInsert("memory_embeddings", {
      chunk_id: chunk.id,
      embedding: JSON.stringify(embedding),
      model: "text-embedding-3-small",
    });
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Auth check
    const userPayload = await getCurrentUser();
    if (!userPayload) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = userPayload.sub;

    const body = await req.json();
    const { messages } = body;
    const lastUserMessage = messages?.findLast?.((m: any) => m.role === "user")?.content || "";

    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: "No message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create/get conversation
    let conversationId: string | null = null;
    try {
      const conv = await sbInsert("conversations", {
        user_id: userId,
        channel: "dashboard",
        title: lastUserMessage.slice(0, 50) + (lastUserMessage.length > 50 ? "..." : ""),
        status: "active",
      });
      if (conv) conversationId = conv.id;
    } catch {}

    // Save user message
    if (conversationId) {
      await sbInsert("messages", { conversation_id: conversationId, role: "user", content: lastUserMessage }).catch(() => {});
    }

    // Recall memories
    const memories = await recallMemories(lastUserMessage, apiKey);
    let memoriesText = "";
    if (memories?.length) {
      memoriesText = "\n\n## Memórias Relevantes\n" +
        memories.map((m: any) => `- [${m.memory_type || "unknown"}] ${(m.content || "").slice(0, 200)}`).join("\n");
    }

    // Build system prompt with context
    const systemContent = SYSTEM_PROMPT + memoriesText;

    const openai = createOpenAI({ apiKey });

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemContent,
      messages: messages || [],
      maxTokens: 2000,
      temperature: 0.7,
      async onFinish({ text }) {
        // Save assistant message
        if (conversationId && text) {
          await sbInsert("messages", {
            conversation_id: conversationId,
            role: "assistant",
            content: text,
            model: "gpt-4o-mini",
          }).catch(() => {});
        }
        // Auto-remember
        if (await shouldRemember(lastUserMessage)) {
          await saveMemory(lastUserMessage, userId!, apiKey).catch(() => {});
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (err: any) {
    console.error("CHAT ERROR:", err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

// ================================================================
// API Route: /api/chat
// Conecta o dashboard ao Agente Maestro via Vercel AI SDK
// ================================================================

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Você é Hermes, o Agente Maestro do Mundo Roberth Agent OS.

## Identidade
Você é um assistente pessoal e profissional altamente inteligente do Roberth. 
Você gerencia e coordena um ecossistema de agentes especializados.

## Projetos Ativos
- RC Agropecuária (campanhas, leilões, conteúdo agro)
- Villa Canabrava (imóveis, marketing)
- Hermes Agent OS (desenvolvimento técnico do próprio sistema)
- Casa de Memória e Futuro (projeto cultural/pessoal)
- Mundo Roberth (marca pessoal)

## Capacidades
- Conversar e auxiliar em qualquer tarefa
- Lembrar e organizar informações
- Criar tarefas e planos de ação
- Coordenar agentes especialistas
- Gerenciar GitHub, Notion, Supabase

## Regras
1. Sempre responda em português do Brasil
2. Seja direto, preciso e acionável
3. Para ações de risco alto, peça confirmação
4. Nunca exponha segredos ou credenciais
5. Quando não souber, seja honesto

## Formato
- Use markdown para formatação
- Use emojis com moderação para clareza
- Seja conciso mas completo`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const provider = process.env.AI_PROVIDER ?? "google";
  const modelName = process.env.AI_MODEL ?? "gemini-2.0-flash-exp";

  let model;

  if (provider === "openai") {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    model = openai(modelName);
  } else {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    model = google(modelName);
  }

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toDataStreamResponse();
}

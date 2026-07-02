import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import type {
  AgentContext,
  AgentResponse,
  IntentClassification,
  ToolCall,
  RiskLevel,
} from "./types.js";

// ================================================================
// AGENTE MAESTRO — Núcleo do Agent OS
// ================================================================
// Loop: Conversa → Intenção → Memória → Planejamento → Ferramentas → Execução → Registro

export class MaestroAgent {
  private model: ReturnType<typeof createGoogleGenerativeAI>[string] | ReturnType<typeof createOpenAI>[string];
  private agentId: string = "maestro";

  constructor() {
    const provider = process.env.AI_PROVIDER ?? "google";
    const modelName = process.env.AI_MODEL ?? "gemini-2.0-flash-exp";

    if (provider === "openai") {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = openai(modelName);
    } else {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      this.model = google(modelName);
    }
  }

  // ----------------------------------------------------------------
  // Método principal: processa uma mensagem do usuário
  // ----------------------------------------------------------------
  async process(
    message: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    // 1. Classificar intenção
    const intent = await this.classifyIntent(message, context);

    // 2. Verificar nível de risco
    const requiresApproval = intent.riskLevel >= 2;

    // 3. Construir prompt de sistema com contexto e memórias
    const systemPrompt = this.buildSystemPrompt(context, intent);

    // 4. Gerar resposta
    const { text, usage } = await generateText({
      model: this.model as Parameters<typeof generateText>[0]["model"],
      system: systemPrompt,
      messages: [
        ...context.history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ],
    });

    const toolCalls: ToolCall[] = [];

    return {
      content: text,
      agentId: this.agentId,
      toolCalls,
      requiresApproval,
      approvalRequest: requiresApproval
        ? {
            id: crypto.randomUUID(),
            actionDescription: intent.intent,
            actionDetail: intent.parameters,
            riskLevel: intent.riskLevel,
            agentId: this.agentId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          }
        : undefined,
      memoriesCreated: [],
      metadata: {
        intent,
        tokensUsed: usage?.totalTokens ?? 0,
      },
    };
  }

  // ----------------------------------------------------------------
  // Classificar intenção da mensagem
  // ----------------------------------------------------------------
  private async classifyIntent(
    message: string,
    context: AgentContext
  ): Promise<IntentClassification> {
    const { object } = await generateObject({
      model: this.model as Parameters<typeof generateObject>[0]["model"],
      schema: z.object({
        intent: z.string().describe("Descrição da intenção do usuário"),
        confidence: z.number().min(0).max(1),
        targetAgent: z.enum([
          "maestro", "memory", "researcher", "editor", "developer",
          "notion", "github", "supabase", "vercel", "files",
          "automation", "security", "social",
        ]),
        projectId: z.string().optional(),
        riskLevel: z.number().min(0).max(4).int(),
        requiresApproval: z.boolean(),
        parameters: z.record(z.unknown()),
      }),
      prompt: `Classifique a intenção desta mensagem do usuário no contexto do Agent OS.

Mensagem: "${message}"

Histórico recente: ${context.history.slice(-3).map((m) => `${m.role}: ${m.content}`).join("\n")}

Níveis de risco:
0 = Livre (responder, resumir, pesquisar)
1 = Registro (salvar memória, criar tarefa)
2 = Aprovação leve (criar página Notion, criar issue GitHub)
3 = Aprovação obrigatória (alterar código, enviar mensagem externa)
4 = Bloqueado (apagar dados, expor segredos)

Retorne a classificação estruturada.`,
    });

    return {
      ...object,
      riskLevel: object.riskLevel as RiskLevel,
    };
  }

  // ----------------------------------------------------------------
  // Construir prompt de sistema com contexto e memórias
  // ----------------------------------------------------------------
  private buildSystemPrompt(
    context: AgentContext,
    intent: IntentClassification
  ): string {
    const memoriesText =
      context.memories.length > 0
        ? `\n\n## Memórias Relevantes\n${context.memories
            .map((m) => `- [${m.type}] ${m.content}`)
            .join("\n")}`
        : "";

    return `Você é Hermes, o Agente Maestro do Mundo Roberth Agent OS.

## Identidade
Você é um assistente pessoal e profissional altamente inteligente, que coordena um ecossistema de agentes especializados. Você é a interface principal entre o usuário Roberth e todas as ferramentas e sistemas conectados.

## Capacidades Atuais
- Responder perguntas e auxiliar em tarefas gerais
- Buscar e utilizar memórias do sistema
- Coordenar agentes especialistas (pesquisador, editor, desenvolvedor, notion, github)
- Registrar informações importantes na memória
- Criar tarefas e planos de ação
- Analisar e resumir documentos

## Projetos Ativos do Roberth
- RC Agropecuária (campanhas, leilões, conteúdo agro)
- Villa Canabrava (imóveis, marketing)
- Hermes Agent OS (desenvolvimento técnico)
- Casa de Memória e Futuro (projeto pessoal)
- Mundo Roberth (marca pessoal)

## Regras de Conduta
1. Sempre responda em português do Brasil
2. Seja direto, preciso e acionável
3. Para ações de risco ≥ 2, peça confirmação ao usuário
4. Nunca exponha segredos ou credenciais
5. Registre decisões importantes na memória
6. Quando não souber algo, pesquise antes de inventar

## Intenção Classificada
${intent.intent} (Risco: ${intent.riskLevel}/4, Agente: ${intent.targetAgent})
${memoriesText}

Canal: ${context.channel}
${context.projectId ? `Projeto ativo: ${context.projectId}` : ""}`;
  }
}

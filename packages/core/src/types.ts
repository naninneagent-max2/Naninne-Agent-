// ================================================================
// TIPOS CENTRAIS DO AGENT OS
// ================================================================

export type RiskLevel = 0 | 1 | 2 | 3 | 4;

export const RISK_LEVELS: Record<RiskLevel, string> = {
  0: "Livre — Responder, resumir, classificar",
  1: "Registro — Salvar memória, criar tarefa",
  2: "Aprovação leve — Criar página, criar issue",
  3: "Aprovação obrigatória — Alterar código, enviar mensagem",
  4: "Bloqueado por padrão — Apagar dados, expor segredos",
};

export type AgentType =
  | "maestro"
  | "memory"
  | "researcher"
  | "editor"
  | "developer"
  | "notion"
  | "github"
  | "supabase"
  | "vercel"
  | "files"
  | "automation"
  | "security"
  | "social";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type MemoryType =
  | "profile"
  | "project"
  | "semantic"
  | "operational"
  | "procedural"
  | "temporal"
  | "tools"
  | "audit";

export type Channel = "telegram" | "dashboard" | "api";

export interface AgentContext {
  userId: string;
  conversationId: string;
  channel: Channel;
  projectId?: string;
  telegramChatId?: number;
  memories: RelevantMemory[];
  history: ChatMessage[];
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  agentId?: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface RelevantMemory {
  memoryId: string;
  content: string;
  type: MemoryType;
  similarity: number;
  projectId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "pending" | "running" | "success" | "failed" | "rejected";
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  durationMs?: number;
}

export interface AgentResponse {
  content: string;
  agentId: string;
  toolCalls: ToolCall[];
  requiresApproval: boolean;
  approvalRequest?: ApprovalRequest;
  memoriesCreated: string[];
  metadata: Record<string, unknown>;
}

export interface ApprovalRequest {
  id: string;
  actionDescription: string;
  actionDetail: Record<string, unknown>;
  riskLevel: RiskLevel;
  agentId: string;
  toolCallId?: string;
  jobId?: string;
  expiresAt: Date;
}

export interface IntentClassification {
  intent: string;
  confidence: number;
  targetAgent: AgentType;
  projectId?: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  parameters: Record<string, unknown>;
}

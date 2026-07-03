// ================================================================
// Notion Brain — Intent detection for automatic task creation
// ================================================================

interface DetectedTask {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  project?: string;
}

// Heuristic keywords that indicate task creation intent
const TASK_KEYWORDS = [
  "cria tarefa",
  "criar tarefa",
  "crie tarefa",
  "crie uma tarefa",
  "adiciona tarefa",
  "adicionar tarefa",
  "nova task",
  "nova tarefa",
  "adiciona no backlog",
  "cria task",
  "criar task",
  "anota isso",
  "anotar isso",
  "lembra de fazer",
  "lembrar de fazer",
  "adiciona ao backlog",
  "bota no backlog",
  "registra tarefa",
  "registrar tarefa",
  "agendar tarefa",
  "agenda tarefa",
];

const PRIORITY_MAP: Record<string, "low" | "medium" | "high" | "urgent"> = {
  baixa: "low",
  low: "low",
  media: "medium",
  "média": "medium",
  medium: "medium",
  alta: "high",
  high: "high",
  urgente: "urgent",
  urgent: "urgent",
  "crítica": "urgent",
  critica: "urgent",
};

const PROJECT_MAP: Record<string, string> = {
  "rc agropecuaria": "RC Agropecuária",
  "rc agropecuária": "RC Agropecuária",
  rc: "RC Agropecuária",
  "villa canabrava": "Villa Canabrava",
  villa: "Villa Canabrava",
  hermes: "Hermes Agent OS",
  "agent os": "Hermes Agent OS",
  "casa de memoria": "Casa de Memória e Futuro",
  "casa de memória": "Casa de Memória e Futuro",
  "mundo roberth": "Mundo Roberth",
  mundo: "Mundo Roberth",
};

/**
 * Detect if a message contains a task creation intent using heuristics.
 * Returns null if no intent detected.
 */
export function detectTaskIntent(message: string): DetectedTask | null {
  const lower = message.toLowerCase().trim();

  // Check if any keyword matches
  const matched = TASK_KEYWORDS.some((kw) => lower.includes(kw));
  if (!matched) return null;

  // Extract the task title — remove the keyword prefix
  let title = message;
  for (const kw of TASK_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      // Take everything after the keyword (removing common connectors)
      title = message.slice(idx + kw.length).replace(/^[\s:,\-—]+/, "").trim();
      break;
    }
  }

  // If title is empty or too short, use the full message
  if (title.length < 3) {
    title = message;
  }

  // Detect priority
  let priority: "low" | "medium" | "high" | "urgent" | undefined;
  for (const [keyword, prio] of Object.entries(PRIORITY_MAP)) {
    if (lower.includes(keyword)) {
      priority = prio;
      // Remove priority keyword from title
      title = title.replace(new RegExp(`\\b${keyword}\\b`, "gi"), "").trim();
      break;
    }
  }

  // Clean up trailing "prioridade" word
  title = title
    .replace(/,?\s*prioridade\s*$/i, "")
    .replace(/,?\s*prioridade\s+\w+\s*$/i, "")
    .trim();

  // Detect project
  let project: string | undefined;
  for (const [keyword, proj] of Object.entries(PROJECT_MAP)) {
    if (lower.includes(keyword)) {
      project = proj;
      break;
    }
  }

  return { title, description: message, priority, project };
}

/**
 * Use LLM to extract task details from a natural language message.
 * Falls back to heuristic detection if LLM is unavailable.
 */
export async function extractTaskWithLLM(
  message: string,
  apiKey: string
): Promise<DetectedTask | null> {
  // First, check heuristic match
  const heuristic = detectTaskIntent(message);
  if (!heuristic) return null;

  // Enhance with LLM for better extraction
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extraia informações de tarefa da mensagem do usuário. Responda APENAS com JSON válido:
{"title":"titulo curto","description":"descricao opcional","priority":"low|medium|high|urgent","project":"nome do projeto ou null"}
Projetos possíveis: RC Agropecuária, Villa Canabrava, Hermes Agent OS, Casa de Memória e Futuro, Mundo Roberth.
Se não conseguir identificar o projeto, use null. Se não tiver prioridade explícita, use "medium".`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 150,
        temperature: 0,
      }),
    });

    if (!res.ok) return heuristic;

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    
    // Parse JSON from response (might have markdown code blocks)
    const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      title: parsed.title || heuristic.title,
      description: parsed.description || heuristic.description,
      priority: parsed.priority || heuristic.priority,
      project: parsed.project || heuristic.project,
    };
  } catch {
    // LLM failed — fall back to heuristic
    return heuristic;
  }
}

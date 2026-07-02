import { Bot, Context, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";
import { MaestroAgent } from "@agent-os/core";
import { MemoryManager } from "@agent-os/memory";
import type { AgentContext, ApprovalRequest } from "@agent-os/core";

// ================================================================
// HERMES — Bot Telegram do Mundo Roberth Agent OS
// ================================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_USER_ID = parseInt(process.env.TELEGRAM_ADMIN_USER_ID ?? "0", 10);

const bot = new Bot(BOT_TOKEN);
const maestro = new MaestroAgent();
const memory = new MemoryManager();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ----------------------------------------------------------------
// Middleware de autenticação — só o admin pode usar
// ----------------------------------------------------------------
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;

  if (userId !== ADMIN_USER_ID) {
    await ctx.reply("⛔ Acesso não autorizado. Este é o bot privado do Mundo Roberth.");
    return;
  }

  await next();
});

// ----------------------------------------------------------------
// Helpers para obter/criar conversa e usuário no Supabase
// ----------------------------------------------------------------
async function getOrCreateUser(telegramId: number, name: string): Promise<string> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  if (data) return data.id;

  const { data: newUser } = await supabase
    .from("users")
    .insert({ telegram_id: telegramId, name, role: "owner" })
    .select("id")
    .single();

  return newUser!.id;
}

async function getOrCreateConversation(
  userId: string,
  chatId: number
): Promise<string> {
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .eq("status", "active")
    .eq("channel", "telegram")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (data) return data.id;

  const { data: conv } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      channel: "telegram",
      telegram_chat_id: chatId,
      title: "Conversa Telegram",
    })
    .select("id")
    .single();

  return conv!.id;
}

async function getHistory(conversationId: string) {
  const { data } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  return (data ?? []).map((m: { role: string; content: string; created_at: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    createdAt: new Date(m.created_at),
  }));
}

async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  agentId?: string
) {
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    agent_id: agentId,
  });
}

// ----------------------------------------------------------------
// Comando /start
// ----------------------------------------------------------------
bot.command("start", async (ctx) => {
  await ctx.reply(
    `🤖 *Hermes — Mundo Roberth Agent OS*\n\n` +
    `Olá, Roberth! Estou online e pronto para ajudar.\n\n` +
    `*O que posso fazer:*\n` +
    `• 💬 Conversar e ajudar em qualquer tarefa\n` +
    `• 🧠 Lembrar informações importantes\n` +
    `• 📋 Criar e gerenciar tarefas\n` +
    `• 🔍 Pesquisar na web\n` +
    `• 📝 Criar conteúdo editorial\n` +
    `• 🐙 Gerenciar GitHub\n` +
    `• 📒 Organizar Notion\n` +
    `• 📊 Consultar dados no Supabase\n\n` +
    `Use /help para ver todos os comandos.`,
    { parse_mode: "Markdown" }
  );
});

// ----------------------------------------------------------------
// Comando /help
// ----------------------------------------------------------------
bot.command("help", async (ctx) => {
  await ctx.reply(
    `📚 *Comandos do Hermes*\n\n` +
    `/start — Iniciar bot\n` +
    `/help — Esta mensagem\n` +
    `/status — Status do sistema\n` +
    `/memoria — Ver memórias recentes\n` +
    `/tarefas — Ver tarefas pendentes\n` +
    `/projetos — Listar projetos ativos\n` +
    `/nova — Iniciar nova conversa\n` +
    `/aprovar [id] — Aprovar ação pendente\n` +
    `/rejeitar [id] — Rejeitar ação pendente\n\n` +
    `Ou simplesmente me escreva qualquer mensagem! 🚀`,
    { parse_mode: "Markdown" }
  );
});

// ----------------------------------------------------------------
// Comando /status
// ----------------------------------------------------------------
bot.command("status", async (ctx) => {
  const { count: taskCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: approvalCount } = await supabase
    .from("approvals")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: memoryCount } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  await ctx.reply(
    `📊 *Status do Agent OS*\n\n` +
    `🟢 Hermes: Online\n` +
    `🧠 Memórias ativas: ${memoryCount ?? 0}\n` +
    `📋 Tarefas pendentes: ${taskCount ?? 0}\n` +
    `⏳ Aprovações pendentes: ${approvalCount ?? 0}\n\n` +
    `_${new Date().toLocaleString("pt-BR")}_`,
    { parse_mode: "Markdown" }
  );
});

// ----------------------------------------------------------------
// Comando /memoria
// ----------------------------------------------------------------
bot.command("memoria", async (ctx) => {
  const memories = await memory.list({ limit: 10 });

  if (memories.length === 0) {
    await ctx.reply("🧠 Nenhuma memória registrada ainda.");
    return;
  }

  const text = memories
    .slice(0, 8)
    .map((m, i) => `${i + 1}. [${m.type}] ${m.content.slice(0, 100)}...`)
    .join("\n");

  await ctx.reply(`🧠 *Memórias Recentes*\n\n${text}`, { parse_mode: "Markdown" });
});

// ----------------------------------------------------------------
// Comando /tarefas
// ----------------------------------------------------------------
bot.command("tarefas", async (ctx) => {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, priority, status, due_date")
    .in("status", ["pending", "in_progress"])
    .order("priority", { ascending: false })
    .limit(10);

  if (!tasks || tasks.length === 0) {
    await ctx.reply("✅ Nenhuma tarefa pendente!");
    return;
  }

  const priorityEmoji: Record<string, string> = {
    urgent: "🔴", high: "🟠", medium: "🟡", low: "🟢"
  };

  const text = tasks
    .map((t: { title: string; priority: string; status: string }) =>
      `${priorityEmoji[t.priority] ?? "⚪"} ${t.title} (${t.status})`
    )
    .join("\n");

  await ctx.reply(`📋 *Tarefas Ativas*\n\n${text}`, { parse_mode: "Markdown" });
});

// ----------------------------------------------------------------
// Comando /nova — iniciar nova conversa
// ----------------------------------------------------------------
bot.command("nova", async (ctx) => {
  const userId = ctx.from!.id;
  const userName = ctx.from?.first_name ?? "Roberth";
  const dbUserId = await getOrCreateUser(userId, userName);

  await supabase
    .from("conversations")
    .update({ status: "archived" })
    .eq("telegram_chat_id", ctx.chat.id)
    .eq("status", "active");

  await supabase.from("conversations").insert({
    user_id: dbUserId,
    channel: "telegram",
    telegram_chat_id: ctx.chat.id,
    title: `Nova conversa — ${new Date().toLocaleDateString("pt-BR")}`,
  });

  await ctx.reply("🔄 Nova conversa iniciada! Como posso ajudar?");
});

// ----------------------------------------------------------------
// Callback de aprovação (botões inline)
// ----------------------------------------------------------------
bot.callbackQuery(/^(approve|reject):(.+)$/, async (ctx) => {
  const [action, approvalId] = [ctx.match[1], ctx.match[2]];

  const { data: approval } = await supabase
    .from("approvals")
    .select("*")
    .eq("id", approvalId)
    .single();

  if (!approval) {
    await ctx.answerCallbackQuery("Aprovação não encontrada.");
    return;
  }

  if (approval.status !== "pending") {
    await ctx.answerCallbackQuery("Esta aprovação já foi decidida.");
    return;
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  await supabase
    .from("approvals")
    .update({
      status: newStatus,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId);

  const emoji = action === "approve" ? "✅" : "❌";
  await ctx.editMessageText(
    `${emoji} Ação *${newStatus === "approved" ? "aprovada" : "rejeitada"}*!\n\n` +
    `_${approval.action_description}_`,
    { parse_mode: "Markdown" }
  );

  await ctx.answerCallbackQuery(`Ação ${newStatus === "approved" ? "aprovada" : "rejeitada"}!`);
});

// ----------------------------------------------------------------
// Handler de mensagens de texto (main loop)
// ----------------------------------------------------------------
bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name ?? "Roberth";
  const userMessage = ctx.message.text;

  // Indicador de digitação
  await ctx.replyWithChatAction("typing");

  try {
    // Obter IDs
    const dbUserId = await getOrCreateUser(userId, userName);
    const conversationId = await getOrCreateConversation(dbUserId, ctx.chat.id);

    // Salvar mensagem do usuário
    await saveMessage(conversationId, "user", userMessage);

    // Buscar histórico e memórias relevantes
    const [history, memories] = await Promise.all([
      getHistory(conversationId),
      memory.recall({ query: userMessage, limit: 5 }),
    ]);

    // Construir contexto do agente
    const agentContext: AgentContext = {
      userId: dbUserId,
      conversationId,
      channel: "telegram",
      telegramChatId: ctx.chat.id,
      memories,
      history,
    };

    // Processar com o Agente Maestro
    const response = await maestro.process(userMessage, agentContext);

    // Salvar resposta
    await saveMessage(conversationId, "assistant", response.content, "maestro");

    // Se requer aprovação, mostrar botões
    if (response.requiresApproval && response.approvalRequest) {
      const approval = response.approvalRequest;

      // Salvar aprovação no banco
      const { data: savedApproval } = await supabase
        .from("approvals")
        .insert({
          agent_id: null, // será preenchido quando agentes tiverem IDs no banco
          action_description: approval.actionDescription,
          action_detail: approval.actionDetail,
          risk_level: approval.riskLevel,
          expires_at: approval.expiresAt.toISOString(),
        })
        .select("id")
        .single();

      const keyboard = new InlineKeyboard()
        .text("✅ Aprovar", `approve:${savedApproval?.id}`)
        .text("❌ Rejeitar", `reject:${savedApproval?.id}`);

      await ctx.reply(
        `${response.content}\n\n` +
        `⚠️ *Ação requer aprovação* (Risco: ${approval.riskLevel}/4)\n` +
        `_${approval.actionDescription}_`,
        { parse_mode: "Markdown", reply_markup: keyboard }
      );
    } else {
      await ctx.reply(response.content, { parse_mode: "Markdown" });
    }

    // Salvar memórias importantes automaticamente
    if (response.memoriesCreated.length > 0) {
      await memory.remember({
        content: userMessage,
        type: "operational",
        userId: dbUserId,
        source: conversationId,
      });
    }

  } catch (error) {
    console.error("Erro no processamento:", error);
    await ctx.reply(
      "❌ Ocorreu um erro ao processar sua mensagem. Tente novamente em instantes."
    );
  }
});

// ----------------------------------------------------------------
// Handler de arquivos/documentos
// ----------------------------------------------------------------
bot.on("message:document", async (ctx) => {
  await ctx.reply(
    "📄 Arquivo recebido! Estou processando...\n\n" +
    "_Análise de arquivos será implementada na Fase 3._",
    { parse_mode: "Markdown" }
  );
});

// ----------------------------------------------------------------
// Handler de fotos
// ----------------------------------------------------------------
bot.on("message:photo", async (ctx) => {
  await ctx.reply(
    "🖼️ Imagem recebida! Análise visual será implementada em breve."
  );
});

// ----------------------------------------------------------------
// Inicialização
// ----------------------------------------------------------------
async function main() {
  console.log("🤖 Hermes iniciando...");
  console.log(`📡 Bot: @hermes4661_bot`);
  console.log(`🔐 Admin ID: ${ADMIN_USER_ID}`);

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

  if (webhookUrl) {
    // Modo webhook (produção no VPS)
    console.log(`🌐 Configurando webhook: ${webhookUrl}`);
    await bot.api.setWebhook(webhookUrl);
    console.log("✅ Webhook configurado!");
  } else {
    // Modo polling (desenvolvimento local)
    console.log("🔄 Iniciando em modo polling (desenvolvimento)...");
    bot.start({
      onStart: () => console.log("✅ Hermes online! Aguardando mensagens..."),
    });
  }
}

main().catch(console.error);

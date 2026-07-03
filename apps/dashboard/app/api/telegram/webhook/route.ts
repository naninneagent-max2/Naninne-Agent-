import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createTask } from "../../../../lib/tasks/create-task";
import { detectTaskIntent } from "../../../../lib/notion-brain";

export const maxDuration = 25;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// ENV & clients (initialized once per cold start)
// ---------------------------------------------------------------------------
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;
const ALLOWED_IDS = (process.env.TELEGRAM_ALLOWED_USER_IDS ?? "")
  .split(",")
  .filter(Boolean)
  .map(Number);

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ---------------------------------------------------------------------------
// Telegram API helper
// ---------------------------------------------------------------------------
async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function reply(chatId: number, text: string, extra?: Record<string, unknown>) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown", ...extra });
}

async function sendTyping(chatId: number) {
  return tg("sendChatAction", { chat_id: chatId, action: "typing" });
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------
const sb = () => supabase();

async function getOrCreateUser(telegramId: number, name: string): Promise<string> {
  const client = sb();
  const { data } = await client
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  if (data) return data.id;

  const { data: newUser } = await client
    .from("users")
    .insert({ telegram_id: telegramId, name, role: "owner" })
    .select("id")
    .single();

  return newUser!.id;
}

async function getOrCreateConversation(userId: string, chatId: number): Promise<string> {
  const client = sb();
  const { data } = await client
    .from("conversations")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .eq("channel", "telegram")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (data) return data.id;

  const { data: conv } = await client
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

async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>
) {
  const client = sb();
  await client.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    metadata: metadata ?? {},
  });
}

async function isUpdateProcessed(updateId: number): Promise<boolean> {
  const client = sb();
  const { data } = await client
    .from("messages")
    .select("id")
    .eq("metadata->>telegram_update_id", String(updateId))
    .limit(1);
  return !!data && data.length > 0;
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

async function cmdStart(chatId: number) {
  return reply(
    chatId,
    `*Hermes -- Mundo Roberth Agent OS*\n\n` +
      `Ola! Estou online e pronto para ajudar.\n\n` +
      `*O que posso fazer:*\n` +
      `- Conversar e ajudar em qualquer tarefa\n` +
      `- Lembrar informacoes importantes\n` +
      `- Criar e gerenciar tarefas\n` +
      `- Organizar Notion\n` +
      `- Consultar dados no Supabase\n\n` +
      `Use /help para ver todos os comandos.`
  );
}

async function cmdHelp(chatId: number) {
  return reply(
    chatId,
    `*Comandos do Hermes*\n\n` +
      `/start -- Iniciar bot\n` +
      `/help -- Esta mensagem\n` +
      `/status -- Status do sistema\n` +
      `/memoria -- Ver memorias recentes\n` +
      `/tarefas -- Ver tarefas pendentes\n` +
      `/nova <descricao> -- Criar nova tarefa\n\n` +
      `Ou simplesmente me escreva qualquer mensagem!`
  );
}

async function cmdStatus(chatId: number) {
  const client = sb();
  const [tasks, approvals, memories] = await Promise.all([
    client.from("tasks").select("*", { count: "exact", head: true }).eq("status", "pending"),
    client.from("approvals").select("*", { count: "exact", head: true }).eq("status", "pending"),
    client.from("memories").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return reply(
    chatId,
    `*Status do Agent OS*\n\n` +
      `Hermes: Online\n` +
      `Memorias ativas: ${memories.count ?? 0}\n` +
      `Tarefas pendentes: ${tasks.count ?? 0}\n` +
      `Aprovacoes pendentes: ${approvals.count ?? 0}\n\n` +
      `_${new Date().toLocaleString("pt-BR")}_`
  );
}

async function cmdMemoria(chatId: number) {
  const client = sb();
  const { data: mems } = await client
    .from("memories")
    .select("type, content, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(8);

  if (!mems || mems.length === 0) {
    return reply(chatId, "Nenhuma memoria registrada ainda.");
  }

  const text = mems
    .map(
      (m: { type: string; content: string }, i: number) =>
        `${i + 1}. [${m.type}] ${m.content.slice(0, 100)}...`
    )
    .join("\n");

  return reply(chatId, `*Memorias Recentes*\n\n${text}`);
}

async function cmdTarefas(chatId: number) {
  const client = sb();
  const { data: tasks } = await client
    .from("tasks")
    .select("id, title, priority, status, due_date")
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (!tasks || tasks.length === 0) {
    return reply(chatId, "Nenhuma tarefa pendente!");
  }

  const emoji: Record<string, string> = {
    urgent: "!!",
    high: "!",
    medium: "-",
    low: "~",
  };

  const text = tasks
    .map(
      (t: { title: string; priority: string; status: string }) =>
        `[${emoji[t.priority] ?? "-"}] ${t.title} (${t.status})`
    )
    .join("\n");

  return reply(chatId, `*Tarefas Ativas*\n\n${text}`);
}

async function cmdNova(chatId: number, userId: string, description: string) {
  if (!description.trim()) {
    return reply(chatId, "Use: `/nova <descricao da tarefa>`\nExemplo: `/nova revisar site`");
  }

  const client = sb();
  const result = await createTask(client, {
    userId,
    title: description.trim(),
    source: "telegram",
    chatId,
  });

  if (result.error) {
    return reply(chatId, `Erro ao criar tarefa: ${result.error}`);
  }

  let msg = `*Tarefa criada!*\n\nTitulo: ${result.task.title}\nID: \`${result.task.id}\`\nStatus: pending`;
  if (result.notionUrl) {
    msg += `\n[Ver no Notion](${result.notionUrl})`;
  }

  return reply(chatId, msg);
}

// ---------------------------------------------------------------------------
// Callback query handler (approval buttons)
// ---------------------------------------------------------------------------
async function handleCallback(callbackQuery: {
  id: string;
  data?: string;
  from: { id: number };
  message?: { chat: { id: number }; message_id: number };
}) {
  const data = callbackQuery.data ?? "";
  const match = data.match(/^(approve|reject):(.+)$/);
  if (!match) {
    await tg("answerCallbackQuery", { callback_query_id: callbackQuery.id, text: "Acao invalida." });
    return;
  }

  const [, action, approvalId] = match;
  const client = sb();

  const { data: approval } = await client
    .from("approvals")
    .select("*")
    .eq("id", approvalId)
    .single();

  if (!approval) {
    await tg("answerCallbackQuery", { callback_query_id: callbackQuery.id, text: "Aprovacao nao encontrada." });
    return;
  }

  if (approval.status !== "pending") {
    await tg("answerCallbackQuery", { callback_query_id: callbackQuery.id, text: "Ja decidida." });
    return;
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  await client
    .from("approvals")
    .update({ status: newStatus, decided_at: new Date().toISOString() })
    .eq("id", approvalId);

  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  if (chatId && messageId) {
    const label = newStatus === "approved" ? "APROVADA" : "REJEITADA";
    await tg("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `Acao *${label}*!\n\n_${approval.action_description}_`,
      parse_mode: "Markdown",
    });
  }

  await tg("answerCallbackQuery", {
    callback_query_id: callbackQuery.id,
    text: `Acao ${newStatus === "approved" ? "aprovada" : "rejeitada"}!`,
  });
}

// ---------------------------------------------------------------------------
// Free-text handler (non-command messages)
// ---------------------------------------------------------------------------
async function handleFreeText(
  chatId: number,
  userId: string,
  conversationId: string,
  text: string,
  updateId: number
) {
  // Save user message
  await saveMessage(conversationId, "user", text, {
    telegram_update_id: String(updateId),
    source: "telegram",
  });

  // Notion Brain — detect task creation intent in free text
  const taskIntent = detectTaskIntent(text);
  if (taskIntent) {
    const client = sb();
    const result = await createTask(client, {
      userId,
      title: taskIntent.title,
      description: taskIntent.description,
      priority: taskIntent.priority,
      source: "telegram",
      chatId,
    });

    let msg = `Tarefa criada: *${result.task.title}*\nStatus: pending`;
    if (result.notionUrl) {
      msg += `\n[Ver no Notion](${result.notionUrl})`;
    }
    if (result.error) {
      msg += `\n(Aviso: ${result.error})`;
    }
    await saveMessage(conversationId, "assistant", msg, { source: "telegram" });
    return reply(chatId, msg);
  }

  // AI response for non-task messages
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = "Recebi sua mensagem. O processamento AI sera ativado em breve.";
    await saveMessage(conversationId, "assistant", fallback, { source: "telegram" });
    return reply(chatId, fallback);
  }

  await sendTyping(chatId);

  // Fetch recent history
  const client = sb();
  const { data: history } = await client
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const messages = [
    {
      role: "system",
      content:
        "Voce e Hermes, assistente pessoal do Roberth no Mundo Roberth Agent OS. " +
        "Responda sempre em portugues do Brasil. Seja direto e acionavel. Use markdown quando util.",
    },
    ...(history ?? []).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI error:", errText);
      const fallback = "Erro ao processar com AI. Tente novamente.";
      await saveMessage(conversationId, "assistant", fallback, { source: "telegram" });
      return reply(chatId, fallback);
    }

    const data = await res.json();
    const aiResponse = data.choices?.[0]?.message?.content ?? "Sem resposta do AI.";

    await saveMessage(conversationId, "assistant", aiResponse, { source: "telegram" });
    return reply(chatId, aiResponse);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("AI processing error:", errMsg);
    const fallback = "Erro ao processar mensagem. Tente novamente.";
    await saveMessage(conversationId, "assistant", fallback, { source: "telegram" });
    return reply(chatId, fallback);
  }
}

// ---------------------------------------------------------------------------
// MAIN ROUTE HANDLER
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  // 1. Validate webhook secret
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET) {
    console.warn("Telegram webhook: invalid secret token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: Record<string, unknown>;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updateId = update.update_id as number;
  if (!updateId) {
    return NextResponse.json({ error: "Missing update_id" }, { status: 400 });
  }

  console.log(`[Telegram] update_id=${updateId}, type=${update.message ? "message" : update.callback_query ? "callback" : "other"}`);

  // 2. Idempotency check
  try {
    if (await isUpdateProcessed(updateId)) {
      console.log(`[Telegram] update_id=${updateId} already processed, skipping`);
      return NextResponse.json({ ok: true, skipped: true });
    }
  } catch (err) {
    // If idempotency check fails, proceed anyway (better to duplicate than lose)
    console.warn("Idempotency check failed:", err);
  }

  // 3. Handle callback queries (approval buttons)
  if (update.callback_query) {
    try {
      await handleCallback(update.callback_query as Parameters<typeof handleCallback>[0]);
    } catch (err) {
      console.error("Callback error:", err);
    }
    return NextResponse.json({ ok: true });
  }

  // 4. Handle messages
  const message = update.message as {
    chat: { id: number };
    from: { id: number; first_name?: string };
    text?: string;
    message_id: number;
  } | undefined;

  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const fromId = message.from.id;
  const fromName = message.from.first_name ?? "User";
  const text = message.text;

  // 5. Access control (optional — if ALLOWED_IDS is empty, allow all)
  if (ALLOWED_IDS.length > 0 && !ALLOWED_IDS.includes(fromId)) {
    console.warn(`[Telegram] Unauthorized user: ${fromId} (${fromName})`);
    await reply(chatId, "Acesso nao autorizado. Este e o bot privado do Mundo Roberth.");
    return NextResponse.json({ ok: true });
  } else if (ALLOWED_IDS.length === 0) {
    // Log attempts from any user when no filter is set
    console.log(`[Telegram] Message from user ${fromId} (${fromName})`);
  }

  try {
    // 6. Resolve user and conversation
    const userId = await getOrCreateUser(fromId, fromName);
    const conversationId = await getOrCreateConversation(userId, chatId);

    // 7. Route commands
    if (text.startsWith("/")) {
      const [cmd, ...args] = text.split(" ");
      const command = cmd.toLowerCase().replace("@naninne_bot", "");

      // Save command as user message for history
      await saveMessage(conversationId, "user", text, {
        telegram_update_id: String(updateId),
        source: "telegram",
        is_command: true,
      });

      switch (command) {
        case "/start":
          await cmdStart(chatId);
          break;
        case "/help":
          await cmdHelp(chatId);
          break;
        case "/status":
          await cmdStatus(chatId);
          break;
        case "/memoria":
          await cmdMemoria(chatId);
          break;
        case "/tarefas":
          await cmdTarefas(chatId);
          break;
        case "/nova":
          await cmdNova(chatId, userId, args.join(" "));
          break;
        default:
          await reply(chatId, `Comando desconhecido: ${command}\nUse /help para ver comandos.`);
      }

      return NextResponse.json({ ok: true });
    }

    // 8. Free-text message
    await handleFreeText(chatId, userId, conversationId, text, updateId);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Telegram] Error processing update ${updateId}:`, errMsg);
    try {
      await reply(chatId, "Ocorreu um erro ao processar sua mensagem. Tente novamente.");
    } catch {}
    return NextResponse.json({ ok: true }); // Always 200 to Telegram to avoid retries
  }
}

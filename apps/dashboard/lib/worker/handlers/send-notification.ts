import { SupabaseClient } from "@supabase/supabase-js";

// ================================================================
// Handler: send_notification
// Payload: { channel: "telegram", message: string, target: number }
// ================================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

interface Payload {
  channel: string;
  message: string;
  target: number | string;
}

export async function run(
  payload: Payload,
  _ctx: { sb: SupabaseClient }
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const { channel, message, target } = payload;

  if (channel !== "telegram") {
    return { ok: false, error: `Unsupported channel: ${channel}` };
  }

  if (!BOT_TOKEN) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  const chatId = typeof target === "string" ? parseInt(target, 10) : target;
  if (!chatId || isNaN(chatId)) {
    return { ok: false, error: `Invalid target chat_id: ${target}` };
  }

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });

  const data = await res.json();

  if (!data.ok) {
    return { ok: false, error: `Telegram API error: ${data.description ?? "unknown"}` };
  }

  return { ok: true, result: { message_id: data.result?.message_id } };
}

import { SupabaseClient } from "@supabase/supabase-js";
import * as sendNotification from "./send-notification";
import * as syncNotion from "./sync-notion";
import * as backgroundMemory from "./background-memory";
import * as executeTool from "./execute-tool";

// ================================================================
// Handler registry — maps job.type → handler.run()
// ================================================================

type Handler = {
  run: (
    payload: Record<string, unknown>,
    ctx: { sb: SupabaseClient }
  ) => Promise<{ ok: boolean; result?: unknown; error?: string }>;
};

const handlers: Record<string, Handler> = {
  send_notification: sendNotification,
  sync_notion: syncNotion,
  background_memory: backgroundMemory,
  execute_tool: executeTool,
};

export function getHandler(type: string): Handler | undefined {
  return handlers[type];
}

export function supportedTypes(): string[] {
  return Object.keys(handlers);
}

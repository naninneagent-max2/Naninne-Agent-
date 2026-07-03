import { SupabaseClient } from "@supabase/supabase-js";
import { Client as NotionClient } from "@notionhq/client";

// ================================================================
// Shared task creation — used by Telegram /nova, chat Notion Brain, worker sync
// ================================================================

interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  projectId?: string;
  source?: string;
  chatId?: number;
}

interface CreateTaskResult {
  task: { id: string; title: string; status: string };
  notionPageId?: string;
  notionUrl?: string;
  error?: string;
}

export async function createTask(
  sb: SupabaseClient,
  input: CreateTaskInput,
  options?: { syncNotion?: boolean }
): Promise<CreateTaskResult> {
  const { userId, title, description, priority, projectId, source, chatId } = input;
  const syncNotion = options?.syncNotion ?? true;

  // 1. Insert task in Supabase
  const { data: task, error: taskError } = await sb
    .from("tasks")
    .insert({
      user_id: userId,
      title: title.trim(),
      description: description ?? `Criada via ${source ?? "sistema"}: ${title.trim()}`,
      status: "pending",
      priority: priority ?? "medium",
      project_id: projectId || null,
      metadata: { source: source ?? "system", chat_id: chatId ?? null },
    })
    .select("id, title, status")
    .single();

  if (taskError || !task) {
    return { task: { id: "", title, status: "error" }, error: taskError?.message ?? "Insert failed" };
  }

  // 2. Sync with Notion (optional)
  let notionPageId: string | undefined;
  let notionUrl: string | undefined;

  if (syncNotion) {
    const notionDbId = process.env.NOTION_HUB_DATABASE_ID;
    const notionToken = process.env.NOTION_TOKEN ?? process.env.NOTION_API_TOKEN;

    if (notionDbId && notionToken) {
      try {
        const notion = new NotionClient({ auth: notionToken });
        const page = await notion.pages.create({
          parent: { database_id: notionDbId },
          properties: {
            Nome: { title: [{ text: { content: title.trim() } }] },
            Status: { select: { name: "Backlog" } },
            "Descrição": {
              rich_text: [{ text: { content: description ?? `Criada via ${source ?? "sistema"}` } }],
            },
          } as Record<string, unknown>,
          children: [
            {
              object: "block" as const,
              paragraph: {
                rich_text: [
                  { text: { content: `Tarefa criada em ${new Date().toLocaleString("pt-BR")}` } },
                ],
              },
            },
          ] as unknown[],
        } as Parameters<typeof notion.pages.create>[0]);

        notionPageId = page.id;
        notionUrl = (page as { url?: string }).url ?? undefined;

        // Update task with notion_page_id
        await sb
          .from("tasks")
          .update({
            metadata: { source: source ?? "system", chat_id: chatId, notion_page_id: page.id },
          })
          .eq("id", task.id);

        // Track in notion_pages table
        await sb.from("notion_pages").insert({
          notion_page_id: page.id,
          notion_parent_id: notionDbId,
          title: title.trim(),
          type: "database_item",
          url: notionUrl ?? null,
          last_synced_at: new Date().toISOString(),
        }).then(() => {});
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[createTask] Notion error:", errMsg);
        // Partial success — task exists in Supabase
      }
    }
  }

  return { task, notionPageId, notionUrl };
}

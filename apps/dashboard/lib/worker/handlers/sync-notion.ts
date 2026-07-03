import { SupabaseClient } from "@supabase/supabase-js";
import { Client as NotionClient } from "@notionhq/client";

// ================================================================
// Handler: sync_notion
// Payload: { task_id?: string, project_id?: string }
// ================================================================

interface Payload {
  task_id?: string;
  project_id?: string;
}

export async function run(
  raw: Record<string, unknown>,
  ctx: { sb: SupabaseClient }
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const payload = raw as unknown as Payload;
  const notionToken = process.env.NOTION_TOKEN ?? process.env.NOTION_API_TOKEN;
  const notionDbId = process.env.NOTION_HUB_DATABASE_ID;

  if (!notionToken || !notionDbId) {
    return { ok: false, error: "Notion not configured (NOTION_TOKEN or NOTION_HUB_DATABASE_ID missing)" };
  }

  const notion = new NotionClient({ auth: notionToken });

  // Sync a single task
  if (payload.task_id) {
    return syncTask(ctx.sb, notion, notionDbId, payload.task_id);
  }

  // Sync all pending tasks for a project
  if (payload.project_id) {
    return syncProject(ctx.sb, notion, notionDbId, payload.project_id);
  }

  return { ok: false, error: "No task_id or project_id provided" };
}

async function syncTask(
  sb: SupabaseClient,
  notion: NotionClient,
  dbId: string,
  taskId: string
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const { data: task, error } = await sb
    .from("tasks")
    .select("id, title, description, status, priority, metadata, project_id")
    .eq("id", taskId)
    .single();

  if (error || !task) {
    return { ok: false, error: `Task not found: ${taskId}` };
  }

  const meta = (task.metadata as Record<string, unknown>) ?? {};
  const existingNotionId = meta.notion_page_id as string | undefined;

  // Status mapping: Supabase → Notion
  const statusMap: Record<string, string> = {
    pending: "Backlog",
    in_progress: "Em Progresso",
    waiting_approval: "Bloqueado",
    done: "Concluído",
    cancelled: "Concluído",
    failed: "Bloqueado",
  };
  const notionStatus = statusMap[task.status] ?? "Backlog";

  if (existingNotionId) {
    // Update existing page
    try {
      await notion.pages.update({
        page_id: existingNotionId,
        properties: {
          Nome: { title: [{ text: { content: task.title } }] },
          Status: { select: { name: notionStatus } },
          "Descrição": {
            rich_text: [{ text: { content: task.description ?? "" } }],
          },
        } as Record<string, unknown>,
      });

      await sb.from("notion_pages").upsert({
        notion_page_id: existingNotionId,
        notion_parent_id: dbId,
        title: task.title,
        type: "database_item",
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "notion_page_id" });

      return { ok: true, result: { action: "updated", notion_page_id: existingNotionId } };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Notion update failed: ${errMsg}` };
    }
  } else {
    // Create new page
    try {
      const page = await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          Nome: { title: [{ text: { content: task.title } }] },
          Status: { select: { name: notionStatus } },
          "Descrição": {
            rich_text: [{ text: { content: task.description ?? "" } }],
          },
        } as Record<string, unknown>,
        children: [
          {
            object: "block" as const,
            paragraph: {
              rich_text: [
                { text: { content: `Sincronizado pelo Worker em ${new Date().toLocaleString("pt-BR")}` } },
              ],
            },
          },
        ] as unknown[],
      } as Parameters<typeof notion.pages.create>[0]);

      const pageUrl = (page as { url?: string }).url ?? "";

      // Update task metadata with notion_page_id
      await sb
        .from("tasks")
        .update({ metadata: { ...meta, notion_page_id: page.id } })
        .eq("id", taskId);

      // Track in notion_pages
      await sb.from("notion_pages").insert({
        notion_page_id: page.id,
        notion_parent_id: dbId,
        title: task.title,
        type: "database_item",
        url: pageUrl,
        last_synced_at: new Date().toISOString(),
      }).then(() => {});

      return { ok: true, result: { action: "created", notion_page_id: page.id, url: pageUrl } };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Notion create failed: ${errMsg}` };
    }
  }
}

async function syncProject(
  sb: SupabaseClient,
  notion: NotionClient,
  dbId: string,
  projectId: string
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const { data: tasks } = await sb
    .from("tasks")
    .select("id")
    .eq("project_id", projectId)
    .in("status", ["pending", "in_progress", "waiting_approval"])
    .limit(20);

  if (!tasks || tasks.length === 0) {
    return { ok: true, result: { synced: 0, message: "No tasks to sync" } };
  }

  let synced = 0;
  let errors = 0;
  for (const t of tasks) {
    const res = await syncTask(sb, notion, dbId, t.id);
    if (res.ok) synced++;
    else errors++;
  }

  return { ok: true, result: { synced, errors, total: tasks.length } };
}

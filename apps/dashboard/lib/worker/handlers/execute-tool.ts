import { SupabaseClient } from "@supabase/supabase-js";

// ================================================================
// Handler: execute_tool
// Payload: { tool_name, tool_input, approval_id? }
// ================================================================

interface Payload {
  tool_name: string;
  tool_input: Record<string, unknown>;
  approval_id?: string;
}

export async function run(
  raw: Record<string, unknown>,
  ctx: { sb: SupabaseClient }
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const tool_name = raw.tool_name as string;
  const tool_input = (raw.tool_input as Record<string, unknown>) ?? {};
  const approval_id = raw.approval_id as string | undefined;

  // 1. If approval is required, check status
  if (approval_id) {
    const { data: approval } = await ctx.sb
      .from("approvals")
      .select("status")
      .eq("id", approval_id)
      .single();

    if (!approval) {
      return { ok: false, error: `Approval ${approval_id} not found` };
    }
    if (approval.status !== "approved") {
      return { ok: false, error: `Approval ${approval_id} not approved (status: ${approval.status})` };
    }
  }

  // 2. Record tool call
  const { data: toolCall } = await ctx.sb
    .from("tool_calls")
    .insert({
      tool_name,
      input: tool_input,
      status: "running",
    })
    .select("id")
    .single();

  // 3. Execute tool based on name
  try {
    let result: unknown;

    switch (tool_name) {
      case "notion.search": {
        const { Client } = await import("@notionhq/client");
        const notion = new Client({ auth: process.env.NOTION_TOKEN ?? process.env.NOTION_API_TOKEN });
        const res = await notion.search({ query: tool_input.query as string, page_size: 10 });
        result = { count: res.results.length, results: res.results.map((r: { id: string }) => r.id) };
        break;
      }
      default:
        return { ok: false, error: `Unknown tool: ${tool_name}` };
    }

    // Update tool call status
    if (toolCall) {
      await ctx.sb
        .from("tool_calls")
        .update({ status: "success", output: result })
        .eq("id", toolCall.id);
    }

    return { ok: true, result };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);

    if (toolCall) {
      await ctx.sb
        .from("tool_calls")
        .update({ status: "failed", error: errMsg })
        .eq("id", toolCall.id);
    }

    return { ok: false, error: errMsg };
  }
}

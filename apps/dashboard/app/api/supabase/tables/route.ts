import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { createServiceClient } from "../../../../lib/supabase";

const TABLES = [
  "users", "projects", "agents", "tasks", "conversations", "messages",
  "memories", "memory_chunks", "memory_embeddings", "approvals",
  "tool_calls", "tool_definitions", "files", "jobs", "job_events",
  "audit_logs", "github_repos", "github_issues", "notion_pages",
  "vercel_deployments", "agent_metrics", "sessions", "automation_rules",
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createServiceClient();
  const results = await Promise.all(
    TABLES.map(async (name) => {
      try {
        const { count } = await sb.from(name).select("*", { count: "exact", head: true });
        return { name, row_count: count ?? 0, has_rls: false };
      } catch {
        return { name, row_count: 0, has_rls: false };
      }
    })
  );

  return NextResponse.json(results);
}

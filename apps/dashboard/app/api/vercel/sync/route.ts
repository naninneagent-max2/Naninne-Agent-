import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { createServiceClient } from "../../../../lib/supabase";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vercelToken = process.env.VERCEL_TOKEN;
  if (!vercelToken) {
    return NextResponse.json({ error: "VERCEL_TOKEN not configured", hint: "Add VERCEL_TOKEN to env" }, { status: 500 });
  }

  try {
    const projectId = process.env.VERCEL_PROJECT_ID || "naninne-agent";
    const teamId = process.env.VERCEL_TEAM_ID;
    const url = new URL("https://api.vercel.com/v6/deployments");
    url.searchParams.set("limit", "20");
    url.searchParams.set("projectId", projectId);
    if (teamId) url.searchParams.set("teamId", teamId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Vercel sync] API error:", res.status, errBody);
      return NextResponse.json({ error: `Vercel API ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const sb = createServiceClient();
    let synced = 0;

    for (const d of data.deployments ?? []) {
      const state = (d.readyState ?? d.state ?? "QUEUED").toUpperCase();
      const validStates = ["BUILDING", "READY", "ERROR", "CANCELED", "QUEUED"];
      const mappedState = validStates.includes(state) ? state : "QUEUED";

      await sb.from("vercel_deployments").upsert({
        vercel_deployment_id: d.uid,
        project_name: d.name ?? "naninne-agent",
        url: d.url ?? null,
        state: mappedState,
        environment: d.target ?? "preview",
        branch: d.meta?.githubCommitRef ?? null,
        commit_sha: d.meta?.githubCommitSha ?? null,
        metadata: {
          commit_message: d.meta?.githubCommitMessage ?? null,
          creator: d.creator?.username ?? null,
        },
        created_at: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
      }, { onConflict: "vercel_deployment_id" });
      synced++;
    }

    return NextResponse.json({ ok: true, synced });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

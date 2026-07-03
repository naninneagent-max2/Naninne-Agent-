import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { createServiceClient } from "../../../../lib/supabase";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch recent deploys from Vercel API
  const vercelToken = process.env.VERCEL_TOKEN;
  if (!vercelToken) {
    return NextResponse.json({ error: "VERCEL_TOKEN not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.vercel.com/v6/deployments?limit=20&projectId=naninne-agent", {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Vercel API error" }, { status: 500 });
    }

    const data = await res.json();
    const sb = createServiceClient();

    // Upsert deployments
    for (const d of data.deployments ?? []) {
      await sb.from("vercel_deployments").upsert({
        deployment_id: d.uid,
        status: d.readyState ?? d.state ?? "UNKNOWN",
        url: d.url,
        branch: d.meta?.githubCommitRef ?? null,
        commit_sha: d.meta?.githubCommitSha ?? null,
        commit_message: d.meta?.githubCommitMessage ?? null,
        created_at: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
      }, { onConflict: "deployment_id" });
    }

    return NextResponse.json({ ok: true, synced: data.deployments?.length ?? 0 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { createServiceClient } from "../../../lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createServiceClient();

  // Get cron config
  const crons = [
    {
      name: "Worker Queue Processor",
      path: "/api/cron/worker",
      schedule: "*/1 * * * *",
      description: "Processa jobs pendentes na fila",
    },
  ];

  // Get last 20 job events for cron-related jobs
  const { data: recentJobs } = await sb
    .from("jobs")
    .select("id, type, status, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Calculate stats
  const total = recentJobs?.length ?? 0;
  const done = recentJobs?.filter((j) => j.status === "done").length ?? 0;
  const failed = recentJobs?.filter((j) => j.status === "failed").length ?? 0;
  const successRate = total > 0 ? Math.round((done / total) * 100) : 0;
  const lastRun = recentJobs?.[0]?.created_at ?? null;

  return NextResponse.json({
    crons: crons.map((c) => ({
      ...c,
      last_run: lastRun,
      success_rate: successRate,
      stats: { total, done, failed },
    })),
    recent_jobs: recentJobs ?? [],
  });
}

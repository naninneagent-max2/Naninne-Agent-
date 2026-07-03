import { NextResponse } from "next/server";
import { processJobs } from "../../../../lib/worker/dispatcher";

export const maxDuration = 25;
export const dynamic = "force-dynamic";

// ================================================================
// GET /api/cron/worker — Vercel Cron Job endpoint
// Processes pending jobs from the queue
// ================================================================

export async function GET(req: Request) {
  // Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const token = authHeader?.replace("Bearer ", "");
    if (token !== cronSecret) {
      console.warn("[Worker Cron] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log(`[Worker Cron] Starting job processing at ${new Date().toISOString()}`);

  try {
    const { processed, results } = await processJobs();

    return NextResponse.json({
      ok: true,
      processed,
      done: results.filter((r) => r.status === "done").length,
      failed: results.filter((r) => r.status === "failed").length,
      retrying: results.filter((r) => r.status === "retrying").length,
      results: results.map((r) => ({
        jobId: r.jobId,
        type: r.type,
        status: r.status,
        durationMs: r.durationMs,
        error: r.error,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Worker Cron] Fatal error:", errMsg);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}

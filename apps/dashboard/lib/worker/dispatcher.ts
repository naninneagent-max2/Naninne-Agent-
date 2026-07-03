import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getHandler } from "./handlers";

// ================================================================
// Worker Dispatcher — processes pending jobs from the queue
// ================================================================

const JOB_TIMEOUT_MS = 24_000; // 24s (Vercel has 25s limit)
const MAX_JOBS_PER_RUN = 10;

function createSb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface JobRow {
  id: string;
  type: string;
  input: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  priority: number;
  task_id: string | null;
}

interface JobResult {
  jobId: string;
  type: string;
  status: "done" | "failed" | "retrying";
  result?: unknown;
  error?: string;
  durationMs: number;
}

export async function processJobs(): Promise<{
  processed: number;
  results: JobResult[];
}> {
  const sb = createSb();
  const results: JobResult[] = [];

  // 1. Fetch pending jobs (ordered by priority DESC, created_at ASC)
  const { data: jobs, error } = await sb
    .from("jobs")
    .select("id, type, input, retry_count, max_retries, priority, task_id")
    .eq("status", "queued")
    .lte("scheduled_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(MAX_JOBS_PER_RUN);

  if (error || !jobs || jobs.length === 0) {
    return { processed: 0, results: [] };
  }

  console.log(`[Worker] Found ${jobs.length} queued jobs`);

  for (const job of jobs as JobRow[]) {
    const start = Date.now();
    let jobResult: JobResult;

    try {
      // Mark as running
      await sb
        .from("jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", job.id);

      await logEvent(sb, job.id, "started", { type: job.type });

      // Find handler
      const handler = getHandler(job.type);
      if (!handler) {
        throw new Error(`No handler for job type: ${job.type}`);
      }

      // Execute with timeout
      const result = await Promise.race([
        handler.run(job.input ?? {}, { sb }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Job timeout exceeded")), JOB_TIMEOUT_MS)
        ),
      ]);

      const duration = Date.now() - start;

      if (result.ok) {
        // Success
        await sb
          .from("jobs")
          .update({
            status: "done",
            output: result.result ?? {},
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        await logEvent(sb, job.id, "completed", { result: result.result, durationMs: duration });

        jobResult = { jobId: job.id, type: job.type, status: "done", result: result.result, durationMs: duration };
      } else {
        // Handler returned error
        throw new Error(result.error ?? "Handler returned ok=false");
      }
    } catch (err: unknown) {
      const duration = Date.now() - start;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Worker] Job ${job.id} (${job.type}) failed:`, errMsg);

      const newRetryCount = job.retry_count + 1;
      const shouldRetry = newRetryCount < job.max_retries;

      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const backoffMs = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s
        const scheduledAt = new Date(Date.now() + backoffMs).toISOString();

        await sb
          .from("jobs")
          .update({
            status: "queued",
            retry_count: newRetryCount,
            error: errMsg,
            scheduled_at: scheduledAt,
          })
          .eq("id", job.id);

        await logEvent(sb, job.id, "retry_scheduled", {
          attempt: newRetryCount,
          next_at: scheduledAt,
          error: errMsg,
        });

        jobResult = { jobId: job.id, type: job.type, status: "retrying", error: errMsg, durationMs: duration };
      } else {
        // Max retries exceeded
        await sb
          .from("jobs")
          .update({
            status: "failed",
            error: errMsg,
            retry_count: newRetryCount,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        await logEvent(sb, job.id, "failed", {
          error: errMsg,
          attempts: newRetryCount,
          durationMs: duration,
        });

        jobResult = { jobId: job.id, type: job.type, status: "failed", error: errMsg, durationMs: duration };
      }
    }

    results.push(jobResult!);
  }

  console.log(
    `[Worker] Processed ${results.length} jobs: ` +
      `${results.filter((r) => r.status === "done").length} done, ` +
      `${results.filter((r) => r.status === "failed").length} failed, ` +
      `${results.filter((r) => r.status === "retrying").length} retrying`
  );

  return { processed: results.length, results };
}

async function logEvent(
  sb: SupabaseClient,
  jobId: string,
  event: string,
  data: Record<string, unknown>
) {
  await sb
    .from("job_events")
    .insert({ job_id: jobId, event, data })
    .then(() => {});
}

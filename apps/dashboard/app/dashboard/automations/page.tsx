"use client";

import { useState, useEffect } from "react";
import { Zap, Clock, Play, CheckCircle, XCircle, RefreshCw } from "lucide-react";

type CronInfo = {
  name: string;
  path: string;
  schedule: string;
  description: string;
  last_run: string | null;
  success_rate: number;
  stats: { total: number; done: number; failed: number };
};

type RecentJob = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  queued: "#6366f1", running: "#f59e0b", done: "#22c55e", failed: "#ef4444", retrying: "#f97316", cancelled: "#6b7280",
};

export default function AutomationsPage() {
  const [crons, setCrons] = useState<CronInfo[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/automations").then((r) => r.json()).catch(() => ({ crons: [], recent_jobs: [] }));
    setCrons(res.crons ?? []);
    setRecentJobs(res.recent_jobs ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Automações</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Cron jobs e workflows</p>
        </div>
        <button className="btn-ghost" onClick={fetchData} data-testid="refresh-automations-btn">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {loading ? (
        [1, 2].map((i) => <div key={i} className="glass rounded-xl h-32 animate-pulse mb-3" style={{ background: "var(--bg-elevated)" }} />)
      ) : (
        <>
          <div className="space-y-3 mb-6" data-testid="automations-list">
            {crons.map((cron, i) => (
              <div key={i} className="glass rounded-xl p-5 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(249, 115, 22, 0.15)" }}>
                      <Zap size={18} style={{ color: "#f97316" }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{cron.name}</h3>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{cron.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1" style={{ color: "var(--text-secondary)" }}>
                      <Clock size={12} />
                      <span className="text-xs font-mono">{cron.schedule}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}>
                      Ativo
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center gap-2">
                    <Play size={12} style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{cron.path}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <CheckCircle size={12} style={{ color: "#22c55e" }} />
                      {cron.stats.done} ok
                    </div>
                    <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <XCircle size={12} style={{ color: "#ef4444" }} />
                      {cron.stats.failed} fail
                    </div>
                    <span style={{ color: cron.success_rate > 80 ? "#22c55e" : cron.success_rate > 50 ? "#f59e0b" : "#ef4444" }}>
                      {cron.success_rate}% sucesso
                    </span>
                    {cron.last_run && (
                      <span style={{ color: "var(--text-muted)" }}>
                        Último: {new Date(cron.last_run).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent jobs */}
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Execuções Recentes</h2>
          {recentJobs.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhuma execução registrada</p>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-hidden" data-testid="recent-jobs-table">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Criado</th>
                    <th className="text-left p-3 font-medium">Concluído</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr key={job.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="p-3 font-mono text-xs">{job.type}</td>
                      <td className="p-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${STATUS_COLORS[job.status] ?? "#6b7280"}20`, color: STATUS_COLORS[job.status] ?? "#6b7280" }}>
                          {job.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{new Date(job.created_at).toLocaleString("pt-BR")}</td>
                      <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{job.completed_at ? new Date(job.completed_at).toLocaleString("pt-BR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

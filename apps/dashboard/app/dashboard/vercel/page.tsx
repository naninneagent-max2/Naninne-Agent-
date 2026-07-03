"use client";

import { useState, useEffect } from "react";
import { BarChart2, RefreshCw, ExternalLink } from "lucide-react";

type Deployment = {
  id: string;
  deployment_id?: string;
  status: string;
  branch?: string;
  commit_sha?: string;
  commit_message?: string;
  url?: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  READY: "#22c55e", ready: "#22c55e",
  BUILDING: "#f59e0b", building: "#f59e0b",
  ERROR: "#ef4444", error: "#ef4444",
  QUEUED: "#6366f1", queued: "#6366f1",
  CANCELED: "#6b7280", canceled: "#6b7280",
};

export default function VercelPage() {
  const [deploys, setDeploys] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { fetchDeploys(); }, []);

  async function fetchDeploys() {
    setLoading(true);
    const res = await fetch("/api/vercel/deployments").then(r => r.json()).catch(() => []);
    setDeploys(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/vercel/sync", { method: "POST" }).catch(() => {});
    await fetchDeploys();
    setSyncing(false);
  }

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Vercel</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Deploys recentes</p>
        </div>
        <button className="btn-ghost" onClick={handleSync} disabled={syncing} data-testid="sync-vercel-btn">
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Sincronizando..." : "Sync com Vercel"}
        </button>
      </div>

      {loading ? (
        [1,2,3].map(i => <div key={i} className="glass rounded-lg h-16 animate-pulse mb-2" style={{ background: "var(--bg-elevated)" }} />)
      ) : deploys.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <BarChart2 size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>Nenhum deploy encontrado. Clique em Sync.</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden" data-testid="deploys-table">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Branch</th>
                <th className="text-left p-3 font-medium">Commit</th>
                <th className="text-left p-3 font-medium">URL</th>
                <th className="text-left p-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map(d => (
                <tr key={d.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="p-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${STATUS_COLORS[d.status] ?? "#6b7280"}20`, color: STATUS_COLORS[d.status] ?? "#6b7280" }}>
                      {d.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-mono" style={{ color: "var(--text-muted)" }}>{d.branch ?? "-"}</td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-mono">{d.commit_sha?.slice(0, 7)}</span>
                    {d.commit_message && <span className="ml-1" style={{ color: "var(--text-muted)" }}>{d.commit_message.slice(0, 40)}</span>}
                  </td>
                  <td className="p-3 text-xs">
                    {d.url && (
                      <a href={d.url.startsWith("http") ? d.url : `https://${d.url}`} target="_blank" rel="noopener" className="flex items-center gap-1 hover:underline" style={{ color: "var(--accent-primary-light)" }}>
                        <ExternalLink size={10} /> Preview
                      </a>
                    )}
                  </td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{new Date(d.created_at).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

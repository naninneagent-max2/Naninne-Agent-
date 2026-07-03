"use client";

import { useState, useEffect } from "react";
import { Activity, Download } from "lucide-react";

type AuditLog = {
  id: string;
  actor_type?: string;
  actor_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => { fetchLogs(); }, [period]);

  async function fetchLogs() {
    setLoading(true);
    const res = await fetch(`/api/audit?period=${period}`).then(r => r.json()).catch(() => []);
    setLogs(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  function exportCSV() {
    const header = "timestamp,actor,action,resource,resource_id,ip\n";
    const rows = logs.map(l => `${l.created_at},${l.actor_type}/${l.actor_id},${l.action},${l.resource_type},${l.resource_id},${l.ip_address}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit_logs.csv"; a.click();
  }

  const filtered = filterAction ? logs.filter(l => l.action.includes(filterAction)) : logs;

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Auditoria</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Timeline de eventos do sistema</p>
        </div>
        <button className="btn-ghost" onClick={exportCSV} data-testid="export-csv-btn">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select className="input-dark" style={{ width: "auto", padding: "6px 12px" }} value={period} onChange={e => setPeriod(e.target.value)} data-testid="filter-period">
          <option value="24h">Ultimas 24h</option>
          <option value="7d">Ultimos 7 dias</option>
          <option value="30d">Ultimos 30 dias</option>
        </select>
        <input className="input-dark" style={{ width: "200px" }} placeholder="Filtrar por acao..." value={filterAction} onChange={e => setFilterAction(e.target.value)} />
      </div>

      {loading ? (
        [1,2,3,4].map(i => <div key={i} className="glass rounded-lg h-12 animate-pulse mb-2" style={{ background: "var(--bg-elevated)" }} />)
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Activity size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>Nenhum evento neste periodo</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden" data-testid="audit-table">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                <th className="text-left p-3 font-medium">Timestamp</th>
                <th className="text-left p-3 font-medium">Ator</th>
                <th className="text-left p-3 font-medium">Acao</th>
                <th className="text-left p-3 font-medium">Recurso</th>
                <th className="text-left p-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="p-3 text-xs font-mono" style={{ color: "var(--text-muted)" }}>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-secondary)" }}>{log.actor_type ?? "system"}</td>
                  <td className="p-3 text-xs font-mono" style={{ color: "var(--text-primary)" }}>{log.action}</td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{log.resource_type ?? "-"}</td>
                  <td className="p-3 text-xs font-mono" style={{ color: "var(--text-muted)" }}>{log.ip_address ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

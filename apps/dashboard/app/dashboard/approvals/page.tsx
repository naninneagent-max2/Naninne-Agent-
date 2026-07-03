"use client";

import { useState, useEffect } from "react";
import { Shield, Check, X } from "lucide-react";

type Approval = {
  id: string;
  status: string;
  action_description?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  risk_level?: number;
  created_at: string;
  decided_at?: string;
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  useEffect(() => { fetchApprovals(); }, []);

  async function fetchApprovals() {
    setLoading(true);
    const res = await fetch("/api/approvals?list=true").then(r => r.json()).catch(() => []);
    setApprovals(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    if (!confirm(`${action === "approve" ? "Aprovar" : "Rejeitar"} esta acao?`)) return;
    await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    fetchApprovals();
  }

  const filtered = approvals.filter(a => a.status === tab);

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Aprovacoes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Fila de acoes que requerem aprovacao</p>
      </div>

      <div className="flex gap-2 mb-4">
        {(["pending", "approved", "rejected"] as const).map(t => (
          <button key={t} className={tab === t ? "btn-primary" : "btn-ghost"} onClick={() => setTab(t)} data-testid={`tab-${t}`}>
            {t === "pending" ? "Pendentes" : t === "approved" ? "Aprovadas" : "Rejeitadas"} ({approvals.filter(a => a.status === t).length})
          </button>
        ))}
      </div>

      {loading ? (
        [1,2,3].map(i => <div key={i} className="glass rounded-lg h-20 animate-pulse mb-2" style={{ background: "var(--bg-elevated)" }} />)
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Shield size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>Nenhuma aprovacao {tab === "pending" ? "pendente" : tab === "approved" ? "aprovada" : "rejeitada"}</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="approvals-list">
          {filtered.map((a, i) => (
            <div key={a.id} className="glass rounded-lg p-4 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border risk-${a.risk_level ?? 0}`}>
                      Risco {a.risk_level ?? 0}
                    </span>
                    {a.tool_name && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
                        {a.tool_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>{a.action_description || "Acao sem descricao"}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{new Date(a.created_at).toLocaleString("pt-BR")}</p>
                </div>
                {tab === "pending" && (
                  <div className="flex gap-1">
                    <button onClick={() => handleAction(a.id, "approve")} className="p-2 rounded-lg hover:bg-green-500/10 transition-colors" style={{ color: "var(--color-success)" }} data-testid={`approve-${a.id}`}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => handleAction(a.id, "reject")} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: "var(--color-danger)" }} data-testid={`reject-${a.id}`}>
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

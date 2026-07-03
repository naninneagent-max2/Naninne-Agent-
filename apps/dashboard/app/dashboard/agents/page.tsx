"use client";

import { useState, useEffect } from "react";
import { Bot, ToggleLeft, ToggleRight } from "lucide-react";

type Agent = {
  id: string;
  name: string;
  role: string;
  description?: string;
  is_active: boolean;
  config?: Record<string, unknown>;
  created_at: string;
};

const AGENT_COLORS: Record<string, string> = {
  maestro: "#6366f1", memory: "#8b5cf6", researcher: "#06b6d4",
  editor: "#10b981", developer: "#f59e0b", notion: "#000000",
  github: "#e2e8f0", security: "#ef4444", planner: "#f97316",
  creative: "#ec4899",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Agent | null>(null);

  useEffect(() => { fetchAgents(); }, []);

  async function fetchAgents() {
    setLoading(true);
    const res = await fetch("/api/agents").then(r => r.json()).catch(() => []);
    setAgents(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  async function toggleAgent(agentId: string, currentState: boolean) {
    const res = await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: agentId, is_active: !currentState }),
    });
    if (res.ok) {
      setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, is_active: !currentState } : a));
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Agentes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Ecossistema de agentes especializados</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="glass rounded-xl h-32 animate-pulse" style={{ background: "var(--bg-elevated)" }} />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Bot size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>Nenhum agente configurado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="agents-grid">
          {agents.map((agent, i) => {
            const color = AGENT_COLORS[agent.role] ?? AGENT_COLORS[agent.name.toLowerCase()] ?? "#6366f1";
            return (
              <div key={agent.id} className="glass rounded-xl p-5 cursor-pointer hover:border-opacity-60 transition-all animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => setSelected(agent)} data-testid={`agent-card-${agent.id}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: color }}>
                    {agent.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{agent.name}</h3>
                    <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{agent.role}</p>
                  </div>
                  {agent.is_active ? (
                    <button onClick={(e) => { e.stopPropagation(); toggleAgent(agent.id, true); }} data-testid={`toggle-agent-${agent.id}`}>
                      <ToggleRight size={20} style={{ color: "var(--color-success)" }} />
                    </button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); toggleAgent(agent.id, false); }} data-testid={`toggle-agent-${agent.id}`}>
                      <ToggleLeft size={20} style={{ color: "var(--text-muted)" }} />
                    </button>
                  )}
                </div>
                <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>{agent.description || "Sem descricao"}</p>
                <div className="mt-3">
                  <span className={`agent-badge ${agent.is_active ? "active" : "idle"}`}>
                    {agent.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agent Detail Modal */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setSelected(null)}>
          <div className="glass-elevated rounded-xl p-6 w-[520px] max-h-[80vh] overflow-auto animate-slide-up" onClick={e => e.stopPropagation()} data-testid="agent-detail-modal">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold" style={{ background: AGENT_COLORS[selected.role] ?? "#6366f1" }}>
                {selected.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{selected.name}</h2>
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{selected.role}</p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{selected.description || "Sem descricao"}</p>
            {selected.config && Object.keys(selected.config).length > 0 && (
              <>
                <h3 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Configuracao</h3>
                <pre className="text-xs p-3 rounded-lg mb-4" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                  {JSON.stringify(selected.config, null, 2)}
                </pre>
              </>
            )}
            <button className="btn-ghost w-full" onClick={() => setSelected(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { Zap, Clock, Play } from "lucide-react";

const CRONS = [
  { name: "Worker Queue Processor", path: "/api/cron/worker", schedule: "*/1 * * * *", description: "Processa jobs pendentes na fila" },
];

export default function AutomationsPage() {
  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Automacoes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Cron jobs e workflows</p>
        </div>
        <button className="btn-ghost" disabled title="Em breve" data-testid="add-automation-btn">
          <Zap size={14} /> Adicionar Automacao
        </button>
      </div>

      <div className="space-y-3" data-testid="automations-list">
        {CRONS.map((cron, i) => (
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
            <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <Play size={12} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{cron.path}</span>
            </div>
          </div>
        ))}

        <div className="glass rounded-xl p-8 text-center" style={{ border: "2px dashed var(--border-default)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Mais automacoes serao adicionadas em breve</p>
        </div>
      </div>
    </div>
  );
}

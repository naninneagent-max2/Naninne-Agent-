"use client";

import { useState, useEffect } from "react";
import { Database, Shield, ShieldCheck } from "lucide-react";

type TableInfo = {
  name: string;
  row_count: number;
  has_rls: boolean;
};

const TABLES = [
  "users", "projects", "agents", "tasks", "conversations", "messages",
  "memories", "memory_chunks", "memory_embeddings", "approvals",
  "tool_calls", "tool_definitions", "files", "jobs", "job_events",
  "audit_logs", "github_repos", "github_issues", "notion_pages",
  "vercel_deployments", "agent_metrics", "sessions", "automation_rules",
];

export default function SupabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTables(); }, []);

  async function fetchTables() {
    setLoading(true);
    const res = await fetch("/api/supabase/tables").then(r => r.json()).catch(() => []);
    setTables(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Supabase</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Visao geral do banco de dados (read-only)</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="glass rounded-lg h-20 animate-pulse" style={{ background: "var(--bg-elevated)" }} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="tables-grid">
          {tables.map((t, i) => (
            <div key={t.name} className="glass rounded-lg p-4 animate-slide-up" style={{ animationDelay: `${i * 20}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database size={14} style={{ color: "#3ecf8e" }} />
                  <span className="font-mono text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.name}</span>
                </div>
                {t.has_rls ? (
                  <ShieldCheck size={14} style={{ color: "var(--color-success)" }} title="RLS ativo" />
                ) : (
                  <Shield size={14} style={{ color: "var(--text-muted)" }} title="RLS inativo" />
                )}
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {t.row_count} {t.row_count === 1 ? "registro" : "registros"}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 glass rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Extensoes Instaladas</h3>
        <div className="flex gap-2 flex-wrap">
          {["pgvector", "pg_trgm", "uuid-ossp", "pgcrypto"].map(ext => (
            <span key={ext} className="text-xs px-2 py-1 rounded-full font-mono" style={{ background: "var(--bg-overlay)", color: "#3ecf8e" }}>
              {ext}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

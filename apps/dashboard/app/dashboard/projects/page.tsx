"use client";

import { useState, useEffect } from "react";
import { FolderOpen, Plus, CheckSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  task_count?: number;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    setLoading(true);
    const res = await fetch("/api/projects").then(r => r.json()).catch(() => []);
    setProjects(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc }),
    });
    setShowModal(false);
    setName("");
    setDesc("");
    fetchProjects();
  }

  const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Projetos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Gerencie seus projetos ativos</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} data-testid="new-project-btn">
          <Plus size={14} /> Novo Projeto
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="glass rounded-xl h-40 animate-pulse" style={{ background: "var(--bg-elevated)" }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <FolderOpen size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>Nenhum projeto encontrado</p>
          <button className="btn-primary mt-4" onClick={() => setShowModal(true)}>Criar Primeiro Projeto</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="projects-grid">
          {projects.map((p, i) => (
            <div key={p.id} className="glass rounded-xl p-5 hover:border-opacity-50 transition-all animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: colors[i % colors.length] }}>
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{p.name}</h3>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>{p.description || "Sem descricao"}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                  <CheckSquare size={12} />
                  <span className="text-xs">{p.task_count ?? 0} tarefas</span>
                </div>
                <Link href={`/dashboard/tasks?project=${p.name}`} className="text-xs flex items-center gap-1 hover:underline" style={{ color: "var(--accent-primary-light)" }}>
                  Ver tarefas <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowModal(false)}>
          <div className="glass-elevated rounded-xl p-6 w-[420px] animate-slide-up" onClick={e => e.stopPropagation()} data-testid="new-project-modal">
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Novo Projeto</h2>
            <input className="input-dark mb-3" placeholder="Nome do projeto" value={name} onChange={e => setName(e.target.value)} data-testid="project-name-input" autoFocus />
            <textarea className="input-dark mb-4" rows={3} placeholder="Descricao (opcional)" value={desc} onChange={e => setDesc(e.target.value)} data-testid="project-desc-input" />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreate} data-testid="project-create-btn">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

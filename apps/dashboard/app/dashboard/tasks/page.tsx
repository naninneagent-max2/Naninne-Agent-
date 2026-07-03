"use client";

import { useState, useEffect } from "react";
import { Plus, ExternalLink, Briefcase, Zap } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  project?: { name: string } | null;
};

type Job = {
  id: string;
  type: string;
  status: string;
  error?: string;
  created_at: string;
  completed_at?: string;
  retry_count: number;
};

const STATUS_COLS = [
  { key: "pending", label: "Backlog", color: "#6366f1" },
  { key: "in_progress", label: "Em Progresso", color: "#f59e0b" },
  { key: "waiting_approval", label: "Bloqueado", color: "#ef4444" },
  { key: "done", label: "Concluido", color: "#22c55e" },
];

const PRIO_COLORS: Record<string, string> = {
  urgent: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#6b7280",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  queued: "#6366f1", running: "#f59e0b", done: "#22c55e", failed: "#ef4444", retrying: "#f97316", cancelled: "#6b7280",
};

export default function TasksPage() {
  const [tab, setTab] = useState<"tasks" | "jobs">("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [filterProject, setFilterProject] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newProjectId, setNewProjectId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [tRes, jRes, pRes] = await Promise.all([
      fetch("/api/tasks").then(r => r.json()).catch(() => []),
      fetch("/api/tasks?type=jobs").then(r => r.json()).catch(() => []),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
    ]);
    setTasks(Array.isArray(tRes) ? tRes : []);
    setJobs(Array.isArray(jRes) ? jRes : []);
    setProjects(Array.isArray(pRes) ? pRes : []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, priority: newPriority, project_id: newProjectId || undefined }),
    });
    setShowModal(false);
    setNewTitle("");
    fetchData();
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  }

  const filtered = tasks.filter(t => {
    if (filterProject && t.project?.name !== filterProject) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {tab === "tasks" ? "Tarefas" : "Jobs do Worker"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {tab === "tasks" ? "Gerencie tarefas do seu projeto" : "Timeline de jobs processados pelo cron"}
          </p>
        </div>
        <div className="flex gap-2">
          <button className={tab === "tasks" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("tasks")} data-testid="tab-tasks">
            <Briefcase size={14} /> Tarefas
          </button>
          <button className={tab === "jobs" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("jobs")} data-testid="tab-jobs">
            <Zap size={14} /> Jobs
          </button>
          {tab === "tasks" && (
            <button className="btn-primary" onClick={() => setShowModal(true)} data-testid="new-task-btn">
              <Plus size={14} /> Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {tab === "tasks" && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <select className="input-dark" style={{ width: "auto", padding: "6px 12px" }} value={filterProject} onChange={e => setFilterProject(e.target.value)} data-testid="filter-project">
              <option value="">Todos os projetos</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <select className="input-dark" style={{ width: "auto", padding: "6px 12px" }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)} data-testid="filter-priority">
              <option value="">Todas prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baixa</option>
            </select>
          </div>

          {/* Kanban */}
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="glass rounded-xl h-48 animate-pulse" style={{ background: "var(--bg-elevated)" }} />)}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4" data-testid="kanban-board">
              {STATUS_COLS.map(col => {
                const colTasks = filtered.filter(t => t.status === col.key);
                return (
                  <div key={col.key} className="glass rounded-xl p-3 min-h-[200px]">
                    <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{col.label}</span>
                      <span className="text-xs ml-auto px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>{colTasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colTasks.map(task => (
                        <div key={task.id} className="glass-elevated rounded-lg p-3 animate-slide-up" style={{ cursor: "default" }}>
                          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{task.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${PRIO_COLORS[task.priority]}20`, color: PRIO_COLORS[task.priority], border: `1px solid ${PRIO_COLORS[task.priority]}40` }}>
                              {task.priority}
                            </span>
                            {!!(task.metadata as Record<string, unknown>)?.notion_page_id && (
                              <a href={`https://notion.so/${String((task.metadata as Record<string, unknown>).notion_page_id).replace(/-/g, "")}`} target="_blank" rel="noopener" className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                                <ExternalLink size={10} /> Notion
                              </a>
                            )}
                          </div>
                          {/* Status changer */}
                          <select className="mt-2 text-[10px] rounded px-1 py-0.5" style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                            value={task.status}
                            onChange={e => handleStatusChange(task.id, e.target.value)}>
                            {STATUS_COLS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                      ))}
                      {colTasks.length === 0 && (
                        <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Vazio</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "jobs" && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Tentativas</th>
                <th className="text-left p-3 font-medium">Erro</th>
                <th className="text-left p-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Nenhum job encontrado</td></tr>
              ) : jobs.map(job => (
                <tr key={job.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="p-3 font-mono text-xs">{job.type}</td>
                  <td className="p-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${JOB_STATUS_COLORS[job.status] ?? "#6b7280"}20`, color: JOB_STATUS_COLORS[job.status] ?? "#6b7280" }}>
                      {job.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{job.retry_count}</td>
                  <td className="p-3 text-xs truncate max-w-[200px]" style={{ color: "var(--color-danger)" }}>{job.error || "-"}</td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{new Date(job.created_at).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowModal(false)}>
          <div className="glass-elevated rounded-xl p-6 w-[420px] animate-slide-up" onClick={e => e.stopPropagation()} data-testid="new-task-modal">
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Nova Tarefa</h2>
            <input className="input-dark mb-3" placeholder="Titulo da tarefa" value={newTitle} onChange={e => setNewTitle(e.target.value)} data-testid="task-title-input" autoFocus />
            <select className="input-dark mb-3" value={newPriority} onChange={e => setNewPriority(e.target.value)} data-testid="task-priority-select">
              <option value="low">Baixa</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
            <select className="input-dark mb-4" value={newProjectId} onChange={e => setNewProjectId(e.target.value)} data-testid="task-project-select">
              <option value="">Sem projeto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreate} data-testid="task-create-btn">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

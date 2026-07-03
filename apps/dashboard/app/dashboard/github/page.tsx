"use client";

import { useState, useEffect } from "react";
import { Github, Plus, ExternalLink } from "lucide-react";

type GithubRepo = {
  id: string;
  owner: string;
  name: string;
  github_id?: number;
  full_name?: string;
  description?: string;
  default_branch?: string;
  created_at: string;
};

export default function GithubPage() {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [owner, setOwner] = useState("");
  const [repoName, setRepoName] = useState("");

  useEffect(() => { fetchRepos(); }, []);

  async function fetchRepos() {
    setLoading(true);
    const res = await fetch("/api/github").then(r => r.json()).catch(() => []);
    setRepos(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!owner.trim() || !repoName.trim()) return;
    await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, name: repoName }),
    });
    setShowModal(false);
    setOwner("");
    setRepoName("");
    fetchRepos();
  }

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>GitHub</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Repositorios vinculados</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} data-testid="add-repo-btn">
          <Plus size={14} /> Adicionar Repo
        </button>
      </div>

      {loading ? (
        [1,2].map(i => <div key={i} className="glass rounded-lg h-24 animate-pulse mb-3" style={{ background: "var(--bg-elevated)" }} />)
      ) : repos.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Github size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>Nenhum repositorio vinculado</p>
          <button className="btn-primary mt-4" onClick={() => setShowModal(true)}>Adicionar Repositorio</button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="repos-list">
          {repos.map((repo, i) => (
            <div key={repo.id} className="glass rounded-xl p-5 animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github size={20} style={{ color: "var(--text-secondary)" }} />
                  <div>
                    <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{repo.full_name || `${repo.owner}/${repo.name}`}</h3>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{repo.description || "Sem descricao"}</p>
                  </div>
                </div>
                <a href={`https://github.com/${repo.owner}/${repo.name}`} target="_blank" rel="noopener" className="btn-ghost text-xs">
                  <ExternalLink size={12} /> Abrir
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowModal(false)}>
          <div className="glass-elevated rounded-xl p-6 w-[400px] animate-slide-up" onClick={e => e.stopPropagation()} data-testid="add-repo-modal">
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Adicionar Repositorio</h2>
            <input className="input-dark mb-3" placeholder="Owner (ex: naninneagent-max2)" value={owner} onChange={e => setOwner(e.target.value)} autoFocus />
            <input className="input-dark mb-4" placeholder="Repo name (ex: Naninne-Agent-)" value={repoName} onChange={e => setRepoName(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAdd}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

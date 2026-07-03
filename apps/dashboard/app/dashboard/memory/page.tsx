"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Search, Plus, Trash2 } from "lucide-react";

type Memory = {
  id: string;
  type: string;
  content: string;
  importance: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  similarity?: number;
};

const TYPE_COLORS: Record<string, string> = {
  profile: "#6366f1", project: "#06b6d4", semantic: "#8b5cf6",
  operational: "#10b981", procedural: "#f59e0b", temporal: "#f97316",
  tools: "#ec4899", audit: "#94a3b8",
};

const TYPES = Object.keys(TYPE_COLORS);

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Memory[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("operational");
  const [newTags, setNewTags] = useState("");

  useEffect(() => { fetchMemories(); }, []);

  async function fetchMemories() {
    setLoading(true);
    const res = await fetch("/api/memories").then(r => r.json()).catch(() => []);
    setMemories(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const res = await fetch("/api/memory/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery }),
    }).then(r => r.json()).catch(() => ({ results: [] }));
    setSearchResults(res.results ?? []);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => { if (searchQuery.trim()) handleSearch(); else setSearchResults(null); }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  async function handleCreate() {
    if (!newContent.trim()) return;
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent, type: newType, tags: newTags.split(",").map(t => t.trim()).filter(Boolean) }),
    });
    setShowModal(false);
    setNewContent("");
    fetchMemories();
  }

  async function handleDelete(id: string) {
    if (!confirm("Esquecer esta memoria?")) return;
    await fetch(`/api/memories?id=${id}`, { method: "DELETE" });
    setMemories(prev => prev.filter(m => m.id !== id));
  }

  const display = searchResults ?? memories.filter(m => !filterType || m.type === filterType);

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Memoria</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Base de conhecimento do Hermes</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} data-testid="new-memory-btn">
          <Plus size={14} /> Nova Memoria
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input className="input-dark pl-10" placeholder="Busca semantica..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} data-testid="memory-search" />
      </div>

      <div className="flex gap-6">
        {/* Type filter sidebar */}
        <div className="w-48 flex-shrink-0 space-y-1">
          <button className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${!filterType ? "font-semibold" : ""}`} style={{ background: !filterType ? "var(--bg-elevated)" : "transparent", color: !filterType ? "var(--text-primary)" : "var(--text-muted)" }} onClick={() => setFilterType("")}>
            Todos ({memories.length})
          </button>
          {TYPES.map(type => {
            const count = memories.filter(m => m.type === type).length;
            return (
              <button key={type} className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${filterType === type ? "font-semibold" : ""}`}
                style={{ background: filterType === type ? "var(--bg-elevated)" : "transparent", color: filterType === type ? "var(--text-primary)" : "var(--text-muted)" }}
                onClick={() => setFilterType(type)}>
                <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[type] }} />
                {type} ({count})
              </button>
            );
          })}
        </div>

        {/* Memory list */}
        <div className="flex-1 space-y-2">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="glass rounded-lg h-20 animate-pulse" style={{ background: "var(--bg-elevated)" }} />)
          ) : display.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Brain size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>{searchQuery ? "Nenhum resultado encontrado" : "Nenhuma memoria registrada"}</p>
            </div>
          ) : (
            display.map((m, i) => (
              <div key={m.id} className="glass rounded-lg p-4 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${TYPE_COLORS[m.type] ?? "#6b7280"}20`, color: TYPE_COLORS[m.type] ?? "#6b7280" }}>
                        {m.type}
                      </span>
                      {m.similarity !== undefined && (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{(m.similarity * 100).toFixed(0)}% match</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>{m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content}</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: "var(--text-muted)" }} data-testid={`delete-memory-${m.id}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowModal(false)}>
          <div className="glass-elevated rounded-xl p-6 w-[480px] animate-slide-up" onClick={e => e.stopPropagation()} data-testid="new-memory-modal">
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Nova Memoria</h2>
            <textarea className="input-dark mb-3" rows={4} placeholder="Conteudo da memoria" value={newContent} onChange={e => setNewContent(e.target.value)} data-testid="memory-content-input" autoFocus />
            <select className="input-dark mb-3" value={newType} onChange={e => setNewType(e.target.value)} data-testid="memory-type-select">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="input-dark mb-4" placeholder="Tags (separadas por virgula)" value={newTags} onChange={e => setNewTags(e.target.value)} data-testid="memory-tags-input" />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreate} data-testid="memory-create-btn">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

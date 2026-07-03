"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, Upload, Trash2, Download, Search, Grid, List,
  Image, Music, Video, File, Eye, X, Tag, FolderOpen, Filter,
} from "lucide-react";

type FileItem = {
  id: string;
  name: string;
  original_name: string;
  internal_name?: string;
  mime_type?: string;
  extension?: string;
  size_bytes?: number;
  origin?: string;
  category?: string;
  tags?: string[];
  processing_status?: string;
  summary?: string;
  signed_url?: string;
  project_id?: string;
  conversation_id?: string;
  created_at: string;
};

type Project = { id: string; name: string };

const ORIGIN_LABELS: Record<string, string> = {
  chat: "Chat",
  dashboard: "Dashboard",
  telegram: "Telegram",
};

const CATEGORY_LABELS: Record<string, string> = {
  imagens: "Imagens",
  documentos: "Documentos",
  audios: "Áudios",
  videos: "Vídeos",
  outros: "Outros",
};

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  imagens: Image,
  documentos: FileText,
  audios: Music,
  videos: Video,
  outros: File,
};

const ORIGIN_COLORS: Record<string, string> = {
  chat: "#6366f1",
  dashboard: "#06b6d4",
  telegram: "#22c55e",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  done: "#22c55e",
  failed: "#ef4444",
};

function formatSize(bytes?: number): string {
  if (!bytes) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [selected, setSelected] = useState<FileItem | null>(null);
  const [preview, setPreview] = useState<FileItem | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterOrigin) params.set("origin", filterOrigin);
    if (filterCategory) params.set("category", filterCategory);
    if (filterProject) params.set("project_id", filterProject);
    if (filterPeriod) params.set("period", filterPeriod);
    params.set("limit", "100");

    const res = await fetch(`/api/files?${params}`).then((r) => r.json()).catch(() => ({ files: [] }));
    setFiles(res.files ?? []);
    setTotal(res.total ?? 0);
    setTotalSize(res.total_size ?? 0);
    setLoading(false);
  }, [search, filterOrigin, filterCategory, filterProject, filterPeriod]);

  useEffect(() => {
    fetchFiles();
    fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(Array.isArray(d) ? d : [])).catch(() => {});
  }, [fetchFiles]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(fetchFiles, 400);
    return () => clearTimeout(timer);
  }, [search, fetchFiles]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(`Erro: ${err.error}`);
      }
    } catch {
      alert("Erro no upload");
    }
    setUploading(false);
    e.target.value = "";
    fetchFiles();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir arquivo permanentemente?")) return;
    await fetch(`/api/files?id=${id}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelected(null);
    setPreview(null);
  }

  function getPreviewUrl(file: FileItem): string | null {
    return file.signed_url || null;
  }

  function isImage(file: FileItem): boolean {
    return file.category === "imagens" || (file.mime_type?.startsWith("image/") ?? false);
  }

  function isAudio(file: FileItem): boolean {
    return file.category === "audios" || (file.mime_type?.startsWith("audio/") ?? false);
  }

  function isVideo(file: FileItem): boolean {
    return file.category === "videos" || (file.mime_type?.startsWith("video/") ?? false);
  }

  function isPdf(file: FileItem): boolean {
    return file.mime_type === "application/pdf";
  }

  const CategoryIcon = (cat: string) => CATEGORY_ICONS[cat] || File;

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }} data-testid="files-title">
            Biblioteca Naninne
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Arquivos centralizados de chat, dashboard e Telegram
            {total > 0 && (
              <span className="ml-2 font-mono">
                — {total} {total === 1 ? "arquivo" : "arquivos"}, {formatSize(totalSize)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-white/10" : ""}`}
            onClick={() => setView("grid")}
            style={{ color: "var(--text-secondary)" }}
            data-testid="view-grid-btn"
          >
            <Grid size={16} />
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-white/10" : ""}`}
            onClick={() => setView("list")}
            style={{ color: "var(--text-secondary)" }}
            data-testid="view-list-btn"
          >
            <List size={16} />
          </button>
          <label className="btn-primary cursor-pointer" data-testid="upload-file-btn">
            <Upload size={14} /> {uploading ? "Enviando..." : "Upload"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            className="input-dark pl-10 w-full"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="files-search"
          />
        </div>
        <select
          className="input-dark"
          style={{ width: "auto", padding: "6px 12px" }}
          value={filterOrigin}
          onChange={(e) => setFilterOrigin(e.target.value)}
          data-testid="filter-origin"
        >
          <option value="">Todas origens</option>
          {Object.entries(ORIGIN_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="input-dark"
          style={{ width: "auto", padding: "6px 12px" }}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          data-testid="filter-category"
        >
          <option value="">Todas categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="input-dark"
          style={{ width: "auto", padding: "6px 12px" }}
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          data-testid="filter-project"
        >
          <option value="">Todos projetos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className="input-dark"
          style={{ width: "auto", padding: "6px 12px" }}
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          data-testid="filter-period"
        >
          <option value="">Todo período</option>
          <option value="24h">Últimas 24h</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-2"}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass rounded-xl animate-pulse" style={{ background: "var(--bg-elevated)", height: view === "grid" ? "200px" : "60px" }} />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center" style={{ border: "2px dashed var(--border-default)" }}>
          <FolderOpen size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p className="text-lg mb-2" style={{ color: "var(--text-muted)" }}>
            {search ? "Nenhum arquivo encontrado" : "Nenhum arquivo ainda"}
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Envie via chat, Telegram ou clique em Upload.
          </p>
          <label className="btn-primary cursor-pointer inline-flex">
            <Upload size={14} /> Primeiro Upload
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      ) : view === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="files-grid">
          {files.map((file, i) => {
            const Icon = CategoryIcon(file.category || "outros");
            return (
              <div
                key={file.id}
                className="glass rounded-xl overflow-hidden cursor-pointer hover:border-opacity-60 transition-all animate-slide-up group"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => setSelected(file)}
                data-testid={`file-card-${file.id}`}
              >
                {/* Preview area */}
                <div className="h-32 flex items-center justify-center relative" style={{ background: "var(--bg-overlay)" }}>
                  {isImage(file) && file.signed_url ? (
                    <img src={file.signed_url} alt={file.original_name} className="w-full h-full object-cover" />
                  ) : (
                    <Icon size={36} style={{ color: "var(--text-muted)" }} />
                  )}
                  {/* Origin badge */}
                  {file.origin && (
                    <span
                      className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: `${ORIGIN_COLORS[file.origin] || "#6b7280"}20`,
                        color: ORIGIN_COLORS[file.origin] || "#6b7280",
                      }}
                    >
                      {ORIGIN_LABELS[file.origin] || file.origin}
                    </span>
                  )}
                  {/* Status badge */}
                  {file.processing_status && file.processing_status !== "done" && (
                    <span
                      className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: `${STATUS_COLORS[file.processing_status] || "#6b7280"}20`,
                        color: STATUS_COLORS[file.processing_status] || "#6b7280",
                      }}
                    >
                      {file.processing_status}
                    </span>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreview(file); }}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                    >
                      <Eye size={16} />
                    </button>
                    {file.signed_url && (
                      <a
                        href={file.signed_url}
                        download={file.original_name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Download size={16} />
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {file.original_name || file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatSize(file.size_bytes)}</span>
                    {file.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
                        {CATEGORY_LABELS[file.category] || file.category}
                      </span>
                    )}
                  </div>
                  {file.summary && (
                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                      {file.summary}
                    </p>
                  )}
                  {file.tags && file.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {file.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-overlay)", color: "var(--accent-primary-light)" }}>
                          {tag}
                        </span>
                      ))}
                      {file.tags.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5" style={{ color: "var(--text-muted)" }}>+{file.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass rounded-xl overflow-hidden" data-testid="files-list">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                <th className="text-left p-3 font-medium">Arquivo</th>
                <th className="text-left p-3 font-medium">Categoria</th>
                <th className="text-left p-3 font-medium">Origem</th>
                <th className="text-left p-3 font-medium">Tamanho</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.id}
                  className="cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onClick={() => setSelected(file)}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {React.createElement(CategoryIcon(file.category || "outros"), { size: 14, style: { color: "var(--text-muted)" } })}
                      <span className="font-medium truncate max-w-[200px]" style={{ color: "var(--text-primary)" }}>
                        {file.original_name || file.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {CATEGORY_LABELS[file.category || ""] || file.category || "-"}
                  </td>
                  <td className="p-3">
                    {file.origin && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: `${ORIGIN_COLORS[file.origin] || "#6b7280"}20`,
                          color: ORIGIN_COLORS[file.origin] || "#6b7280",
                        }}
                      >
                        {ORIGIN_LABELS[file.origin] || file.origin}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{formatSize(file.size_bytes)}</td>
                  <td className="p-3">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: `${STATUS_COLORS[file.processing_status || "pending"] || "#6b7280"}20`,
                        color: STATUS_COLORS[file.processing_status || "pending"] || "#6b7280",
                      }}
                    >
                      {file.processing_status || "pending"}
                    </span>
                  </td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(file.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setPreview(file)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--text-muted)" }}>
                        <Eye size={14} />
                      </button>
                      {file.signed_url && (
                        <a href={file.signed_url} download={file.original_name} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--text-muted)" }}>
                          <Download size={14} />
                        </a>
                      )}
                      <button onClick={() => handleDelete(file.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--text-muted)" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 flex justify-end z-50" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setSelected(null)}>
          <div
            className="w-[480px] h-full overflow-auto animate-slide-up"
            style={{ background: "var(--bg-surface)" }}
            onClick={(e) => e.stopPropagation()}
            data-testid="file-detail-drawer"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Detalhes</h2>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--text-muted)" }}>
                  <X size={18} />
                </button>
              </div>

              {/* Preview */}
              <div className="rounded-xl overflow-hidden mb-4" style={{ background: "var(--bg-overlay)" }}>
                {isImage(selected) && selected.signed_url ? (
                  <img src={selected.signed_url} alt={selected.original_name} className="w-full max-h-[300px] object-contain" />
                ) : isVideo(selected) && selected.signed_url ? (
                  <video src={selected.signed_url} controls className="w-full max-h-[300px]" />
                ) : isAudio(selected) && selected.signed_url ? (
                  <div className="p-6">
                    <audio src={selected.signed_url} controls className="w-full" />
                  </div>
                ) : isPdf(selected) && selected.signed_url ? (
                  <embed src={selected.signed_url} type="application/pdf" className="w-full h-[300px]" />
                ) : (
                  <div className="p-8 flex items-center justify-center">
                    {React.createElement(CategoryIcon(selected.category || "outros"), { size: 48, style: { color: "var(--text-muted)" } })}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <Field label="Nome original" value={selected.original_name || selected.name} />
                {selected.internal_name && <Field label="Nome interno" value={selected.internal_name} mono />}
                <Field label="Tipo MIME" value={selected.mime_type || "N/A"} mono />
                <Field label="Tamanho" value={formatSize(selected.size_bytes)} />
                <Field label="Categoria" value={CATEGORY_LABELS[selected.category || ""] || selected.category || "N/A"} />
                <Field label="Origem" value={ORIGIN_LABELS[selected.origin || ""] || selected.origin || "N/A"} />
                <Field label="Status" value={selected.processing_status || "pending"} />
                <Field label="Criado em" value={new Date(selected.created_at).toLocaleString("pt-BR")} />
                {selected.summary && <Field label="Resumo" value={selected.summary} />}
              </div>

              {/* Tags */}
              {selected.tags && selected.tags.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Tags</p>
                  <div className="flex gap-1 flex-wrap">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "var(--bg-overlay)", color: "var(--accent-primary-light)" }}>
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-6">
                {selected.signed_url && (
                  <a href={selected.signed_url} download={selected.original_name} className="btn-primary flex-1 text-center">
                    <Download size={14} /> Download
                  </a>
                )}
                <button onClick={() => handleDelete(selected.id)} className="btn-ghost" style={{ color: "var(--color-danger)" }}>
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setPreview(null)}>
          <div className="max-w-[90vw] max-h-[90vh] relative" onClick={(e) => e.stopPropagation()} data-testid="file-preview-modal">
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 p-2 rounded-lg hover:bg-white/10 text-white"
            >
              <X size={20} />
            </button>
            {isImage(preview) && preview.signed_url ? (
              <img src={preview.signed_url} alt={preview.original_name} className="max-w-full max-h-[85vh] rounded-lg" />
            ) : isVideo(preview) && preview.signed_url ? (
              <video src={preview.signed_url} controls className="max-w-full max-h-[85vh] rounded-lg" />
            ) : isAudio(preview) && preview.signed_url ? (
              <div className="glass-elevated rounded-xl p-8">
                <p className="text-sm mb-4" style={{ color: "var(--text-primary)" }}>{preview.original_name}</p>
                <audio src={preview.signed_url} controls className="w-[400px]" />
              </div>
            ) : isPdf(preview) && preview.signed_url ? (
              <embed src={preview.signed_url} type="application/pdf" className="w-[80vw] h-[85vh] rounded-lg" />
            ) : (
              <div className="glass-elevated rounded-xl p-12 text-center">
                <File size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                <p style={{ color: "var(--text-muted)" }}>Preview não disponível para este tipo de arquivo</p>
                {preview.signed_url && (
                  <a href={preview.signed_url} download={preview.original_name} className="btn-primary mt-4 inline-flex">
                    <Download size={14} /> Download
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""}`} style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

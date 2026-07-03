"use client";

import { useState, useEffect } from "react";
import { FileText, Upload, Trash2, Download } from "lucide-react";

type FileItem = {
  id: string;
  filename: string;
  mime_type?: string;
  size_bytes?: number;
  storage_path?: string;
  created_at: string;
};

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchFiles(); }, []);

  async function fetchFiles() {
    setLoading(true);
    const res = await fetch("/api/files").then(r => r.json()).catch(() => []);
    setFiles(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    await fetch("/api/files/upload", { method: "POST", body: formData }).catch(() => {});
    setUploading(false);
    fetchFiles();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir arquivo?")) return;
    await fetch(`/api/files?id=${id}`, { method: "DELETE" });
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  function formatSize(bytes?: number) {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Arquivos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Upload e gerenciamento de arquivos</p>
        </div>
        <label className="btn-primary cursor-pointer" data-testid="upload-file-btn">
          <Upload size={14} /> {uploading ? "Enviando..." : "Upload"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        [1,2,3].map(i => <div key={i} className="glass rounded-lg h-16 animate-pulse mb-2" style={{ background: "var(--bg-elevated)" }} />)
      ) : files.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center" style={{ border: "2px dashed var(--border-default)" }}>
          <FileText size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>Nenhum arquivo. Arraste ou clique em Upload.</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden" data-testid="files-list">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                <th className="text-left p-3 font-medium">Arquivo</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Tamanho</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-right p-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>{f.filename}</td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{f.mime_type || "unknown"}</td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{formatSize(f.size_bytes)}</td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{new Date(f.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--text-muted)" }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

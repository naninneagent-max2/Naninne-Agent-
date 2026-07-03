"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, Shield, Link2, Palette } from "lucide-react";

type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export default function SettingsPage() {
  const [tab, setTab] = useState<"profile" | "security" | "integrations" | "preferences">("profile");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [msg, setMsg] = useState("");

  const [integrations, setIntegrations] = useState<{ name: string; key: string; connected: boolean; masked: string | null }[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) { setUser(d.user); setName(d.user.name || ""); }
    }).catch(() => {});
    fetch("/api/settings/integrations").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setIntegrations(d);
    }).catch(() => {});
  }, []);

  async function saveName() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    setMsg("Nome atualizado!");
    setTimeout(() => setMsg(""), 3000);
  }

  async function changePassword() {
    if (newPw !== confirmPw) { setMsg("Senhas nao conferem"); return; }
    if (newPw.length < 8) { setMsg("Senha deve ter pelo menos 8 caracteres"); return; }
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    if (res.ok) { setMsg("Senha alterada!"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    else { const d = await res.json(); setMsg(d.error || "Erro ao alterar senha"); }
    setTimeout(() => setMsg(""), 3000);
  }

  const tabs = [
    { key: "profile", label: "Perfil", icon: User },
    { key: "security", label: "Seguranca", icon: Shield },
    { key: "integrations", label: "Integracoes", icon: Link2 },
    { key: "preferences", label: "Preferencias", icon: Palette },
  ] as const;

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Configuracoes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Perfil, seguranca e preferencias</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} className={tab === t.key ? "btn-primary" : "btn-ghost"} onClick={() => setTab(t.key)} data-testid={`tab-${t.key}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className="mb-4 p-3 rounded-lg text-sm animate-slide-up" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-primary-light)" }}>
          {msg}
        </div>
      )}

      {tab === "profile" && (
        <div className="glass rounded-xl p-6 max-w-lg">
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input className="input-dark" value={user?.email ?? ""} disabled />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Nome</label>
            <input className="input-dark" value={name} onChange={e => setName(e.target.value)} data-testid="settings-name-input" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Role</label>
            <input className="input-dark" value={user?.role ?? ""} disabled />
          </div>
          <button className="btn-primary" onClick={saveName} disabled={saving} data-testid="settings-save-btn">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      )}

      {tab === "security" && (
        <div className="glass rounded-xl p-6 max-w-lg">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Alterar Senha</h3>
          <input className="input-dark mb-3" type="password" placeholder="Senha atual" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
          <input className="input-dark mb-3" type="password" placeholder="Nova senha" value={newPw} onChange={e => setNewPw(e.target.value)} />
          <input className="input-dark mb-4" type="password" placeholder="Confirmar nova senha" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          <button className="btn-primary" onClick={changePassword} data-testid="change-password-btn">Alterar Senha</button>
        </div>
      )}

      {tab === "integrations" && (
        <div className="space-y-3 max-w-lg">
          {integrations.map(int => (
            <div key={int.name} className="glass rounded-lg p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium" style={{ color: "var(--text-primary)" }}>{int.name}</h4>
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{int.masked || "Não configurado"}</p>
              </div>
              <span className={`agent-badge ${int.connected ? "active" : "idle"}`}>
                {int.connected ? "Conectado" : "Desconectado"}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "preferences" && (
        <div className="glass rounded-xl p-6 max-w-lg">
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Tema</label>
            <select className="input-dark" disabled>
              <option>Dark Cosmic</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Idioma</label>
            <select className="input-dark" disabled>
              <option>Portugues (BR)</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Timezone</label>
            <select className="input-dark" disabled>
              <option>America/Sao_Paulo (BRT)</option>
            </select>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Preferencias serao configuráveis em uma versao futura.</p>
        </div>
      )}
    </div>
  );
}

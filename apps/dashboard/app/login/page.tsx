"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Falha no login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at 20% 30%, rgba(91, 94, 250, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(124, 127, 255, 0.08) 0%, transparent 55%), #070a12" }}>
      <div className="w-full max-w-md" data-testid="login-page">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg, #4545d4, #5b5efa, #7c7fff)", boxShadow: "0 0 20px rgba(91,94,250,0.25)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Hermes</h1>
          <p className="text-sm mt-1" style={{ color: "#3e4a5e" }}>Mundo Roberth Agent OS</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-8" style={{ background: "rgba(12,16,24,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(228,235,250,0.08)" }}>
          <h2 className="text-lg font-semibold mb-6 text-white">{isRegister ? "Criar conta" : "Entrar"}</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(240,72,72,0.1)", color: "#f04848", border: "1px solid rgba(240,72,72,0.2)" }} data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#7e8a9e" }}>Nome</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none" style={{ background: "#141a28", border: "1px solid rgba(228,235,250,0.08)" }} placeholder="Seu nome" data-testid="register-name-input" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#7e8a9e" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#5b5efa]" style={{ background: "#141a28", border: "1px solid rgba(228,235,250,0.08)" }} placeholder="seu@email.com" data-testid="login-email-input" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#7e8a9e" }}>Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#5b5efa]" style={{ background: "#141a28", border: "1px solid rgba(228,235,250,0.08)" }} placeholder="••••••••" data-testid="login-password-input" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #4545d4, #5b5efa)" }} data-testid="login-submit-button">
              {loading ? "Carregando..." : isRegister ? "Criar conta" : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsRegister(!isRegister); setError(""); }} className="text-sm hover:underline" style={{ color: "#7c7fff" }} data-testid="toggle-auth-mode">
              {isRegister ? "Já tem conta? Entrar" : "Não tem conta? Criar agora"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare, Brain, CheckSquare, FolderOpen,
  Users, Zap, FileText, Github, Database,
  BarChart2, Shield, Settings, Bot, ChevronLeft,
  ChevronRight, Activity
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { label: "Chat", href: "/dashboard", icon: MessageSquare, color: "#6366f1" },
  { label: "Agentes", href: "/dashboard/agents", icon: Bot, color: "#8b5cf6" },
  { label: "Memória", href: "/dashboard/memory", icon: Brain, color: "#a78bfa" },
  { label: "Projetos", href: "/dashboard/projects", icon: FolderOpen, color: "#06b6d4" },
  { label: "Tarefas", href: "/dashboard/tasks", icon: CheckSquare, color: "#10b981" },
  { label: "Arquivos", href: "/dashboard/files", icon: FileText, color: "#f59e0b" },
  { label: "Automações", href: "/dashboard/automations", icon: Zap, color: "#f97316" },
  { label: "GitHub", href: "/dashboard/github", icon: Github, color: "#e2e8f0" },
  { label: "Supabase", href: "/dashboard/supabase", icon: Database, color: "#3ecf8e" },
  { label: "Vercel", href: "/dashboard/vercel", icon: BarChart2, color: "#ffffff" },
  { label: "Aprovações", href: "/dashboard/approvals", icon: Shield, color: "#ef4444" },
  { label: "Auditoria", href: "/dashboard/audit", icon: Activity, color: "#94a3b8" },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings, color: "#64748b" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "flex flex-col border-r transition-all duration-300 ease-in-out",
        "glass",
        collapsed ? "w-16" : "w-60"
      )}
      style={{ borderColor: "var(--border-default)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold animate-pulse-glow"
              style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
            >
              H
            </div>
            <div>
              <p className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>
                Hermes
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Agent OS
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mx-auto animate-pulse-glow"
            style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
          >
            H
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md transition-colors hover:bg-white/5"
          style={{ color: "var(--text-muted)", marginLeft: collapsed ? "auto" : "0" }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={clsx("nav-item", isActive && "active")}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={16}
                  style={{ color: isActive ? item.color : "inherit", flexShrink: 0 }}
                />
                {!collapsed && (
                  <span className="text-sm truncate animate-fade-in">
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer — system status */}
      <div
        className="p-3 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {!collapsed ? (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--color-success)", boxShadow: "0 0 6px #22c55e" }}
              />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Hermes Online
              </span>
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              @hermes4661_bot
            </p>
          </div>
        ) : (
          <div
            className="w-2 h-2 rounded-full mx-auto"
            style={{ background: "var(--color-success)", boxShadow: "0 0 6px #22c55e" }}
          />
        )}
      </div>
    </aside>
  );
}

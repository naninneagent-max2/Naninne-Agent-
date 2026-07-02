"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Plus, RotateCcw, Paperclip, Bot } from "lucide-react";
import { useChat } from "ai/react";
import { clsx } from "clsx";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-2 items-start animate-fade-in">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
      >
        <Bot size={14} />
      </div>
      <div
        className="glass-elevated rounded-2xl rounded-tl-sm px-4 py-3"
        style={{ border: "1px solid var(--border-default)" }}
      >
        <div className="flex gap-1 items-center h-5">
          <div className="thinking-dot" />
          <div className="thinking-dot" />
          <div className="thinking-dot" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="message-user text-sm" style={{ color: "white" }}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-start animate-slide-up">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
      >
        <Bot size={14} />
      </div>
      <div className="message-assistant text-sm" style={{ color: "var(--text-primary)" }}>
        <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--accent-primary-light)" }}>
          Hermes
        </p>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

const QUICK_PROMPTS = [
  "📊 Status dos projetos",
  "🧠 O que você lembra sobre a RC Agropecuária?",
  "📋 Quais tarefas estão pendentes?",
  "🐙 Status do repositório GitHub",
  "📝 Crie uma tarefa para hoje",
];

export function ChatInterface() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } =
    useChat({ api: "/api/chat" });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest("form");
      form?.requestSubmit();
    }
  };

  const clearChat = () => setMessages([]);

  const handleQuickPrompt = (prompt: string) => {
    const syntheticEvent = {
      target: { value: prompt },
    } as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(syntheticEvent as React.ChangeEvent<HTMLTextAreaElement>);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b glass"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center animate-pulse-glow"
            style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
          >
            <Bot size={18} />
          </div>
          <div>
            <h1
              className="font-bold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              Hermes — Agent OS
            </h1>
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--color-success)", boxShadow: "0 0 4px #22c55e" }}
              />
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Online · Gemini 2.0
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="btn-ghost text-xs"
            title="Limpar conversa"
          >
            <RotateCcw size={13} />
            Limpar
          </button>
          <button className="btn-ghost text-xs">
            <Plus size={13} />
            Nova
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            {/* Logo */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 animate-pulse-glow"
              style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1, #8b5cf6)" }}
            >
              <Bot size={36} />
            </div>

            <h2 className="text-2xl font-bold mb-2 gradient-text">
              Mundo Roberth Agent OS
            </h2>
            <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
              Conversa → Intenção → Memória → Execução → Registro
            </p>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="btn-ghost text-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <ThinkingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="px-6 py-4 border-t glass"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <button
            type="button"
            className="btn-ghost p-2.5 flex-shrink-0 mb-0.5"
            title="Anexar arquivo"
          >
            <Paperclip size={16} />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Escreva para Hermes... (Enter para enviar, Shift+Enter para nova linha)"
              rows={1}
              className={clsx(
                "input-dark resize-none min-h-[42px] max-h-[200px]",
                "py-2.5 pr-4"
              )}
              style={{
                lineHeight: "1.5",
                overflowY: "auto",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={clsx(
              "btn-primary p-2.5 flex-shrink-0 mb-0.5",
              (!input.trim() || isLoading) && "opacity-50 cursor-not-allowed transform-none shadow-none"
            )}
          >
            <Send size={16} />
          </button>
        </form>

        <p className="text-[10px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
          Hermes pode cometer erros. Ações de risco ≥ 2 requerem sua aprovação.
        </p>
      </div>
    </div>
  );
}

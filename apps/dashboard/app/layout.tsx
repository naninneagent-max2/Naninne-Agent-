import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mundo Roberth — Agent OS",
  description: "Sistema Operacional de Agentes Inteligentes — Hermes, Memória, Tarefas, GitHub, Notion e Supabase",
  keywords: ["agent os", "hermes", "mundo roberth", "ai agent", "automation"],
  authors: [{ name: "Roberth" }],
  themeColor: "#080b14",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="gradient-cosmic antialiased">
        {children}
      </body>
    </html>
  );
}

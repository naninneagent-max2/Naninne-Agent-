# 🤖 Mundo Roberth — Agent OS

> **Sistema Operacional de Agentes Inteligentes**  
> Conversa → Intenção → Memória → Planejamento → Ferramentas → Execução → Registro → Aprendizado

---

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                      USUÁRIO                              │
│              Telegram / Dashboard / API                   │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │    Agente Maestro    │  ← Roteador de intenção
              │       (Hermes)       │  ← Memória + Contexto
              └──────┬───────────────┘
                     │
        ┌────────────┼────────────────┐
        ▼            ▼                ▼
   ┌─────────┐  ┌─────────┐   ┌──────────┐
   │ Memória │  │  Tools  │   │ Agentes  │
   │ Manager │  │  Layer  │   │Especialist│
   └────┬────┘  └────┬────┘   └────┬─────┘
        │            │             │
        ▼            ▼             ▼
   ┌──────────────────────────────────────┐
   │              SUPABASE                │
   │  Postgres + pgvector + Storage       │
   └──────────────────────────────────────┘
```

## 📁 Estrutura do Projeto

```
mundo-roberth-agent-os/
  apps/
    dashboard/        → Next.js 15 + Tailwind (deploy: Vercel)
    telegram-bot/     → Hermes Gateway com Grammy.js (deploy: VPS)
    worker/           → Filas e jobs (deploy: VPS)
  packages/
    core/             → Agente Maestro + tipos centrais
    memory/           → Gerenciador de memória (8 tipos)
    tools/            → Integrações: GitHub, Notion, Supabase, Web
    agents/           → Agentes especialistas
  supabase/
    migrations/       → Schema do banco (24 tabelas + pgvector)
    edge-functions/   → Funções serverless
  docker/
    docker-compose.yml → Deploy VPS completo
    hermes/Dockerfile
    worker/Dockerfile
```

## 🚀 Início Rápido

### 1. Pré-requisitos

- Node.js 20+
- pnpm 9+
- Conta Supabase
- Bot Telegram criado com @BotFather
- API Key: Google Gemini ou OpenAI

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

### 4. Rodar migrations do Supabase

```bash
# Instalar CLI Supabase
npm install -g supabase

# Login
supabase login

# Link com seu projeto
supabase link --project-ref hooygjhbqfqtfqqfccxh

# Rodar migrations
supabase db push
```

### 5. Iniciar em desenvolvimento

```bash
# Todos os apps simultaneamente
pnpm dev

# Só o dashboard
pnpm --filter @agent-os/dashboard dev

# Só o bot
pnpm --filter @agent-os/telegram-bot dev
```

O dashboard estará em: `http://localhost:3000`

## 🛸 Deploy

### Dashboard → Vercel

```bash
# No repositório conectado à Vercel
vercel --prod

# Ou via GitHub: push na main faz deploy automático
```

**Variáveis de ambiente na Vercel:**
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Bot + Worker → VPS Hostinger

```bash
# No VPS via SSH:
git clone https://github.com/naninneagent-max2/Naninne-Agent-.git
cd Naninne-Agent-

# Configurar .env no VPS
cp .env.example .env
nano .env

# Deploy com Docker
cd docker
docker compose up -d

# Verificar logs
docker compose logs -f hermes
```

## 🧠 Tipos de Memória

| Tipo | Descrição |
|------|-----------|
| `profile` | Preferências pessoais, estilo, identidade |
| `project` | RC Agropecuária, Villa Canabrava, Hermes... |
| `semantic` | Trechos vetorizados de conversas e docs |
| `operational` | Tarefas, jobs, status, execuções |
| `procedural` | Playbooks, prompts, fluxos |
| `temporal` | Eventos datados, recorrências |
| `tools` | Ferramentas, tokens, status, limites |
| `audit` | Log completo de ações por agente |

## 🔐 Níveis de Risco

| Nível | Descrição | Exemplos |
|-------|-----------|---------|
| 0 | Livre | Responder, resumir, pesquisar |
| 1 | Registro | Salvar memória, criar tarefa |
| 2 | Aprovação leve | Criar página Notion, criar issue |
| 3 | Aprovação obrigatória | Alterar código, abrir PR |
| 4 | Bloqueado | Apagar dados, expor segredos |

## 📊 Projetos Ativos

- **RC Agropecuária** — Campanhas, leilões, conteúdo agro
- **Villa Canabrava** — Projetos imobiliários
- **Hermes Agent OS** — Este sistema
- **Casa de Memória e Futuro** — Projeto cultural
- **Mundo Roberth** — Marca pessoal

## 🔧 Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Monorepo | Turborepo + pnpm |
| Bot Telegram | Grammy.js + Node.js |
| Dashboard | Next.js 15 + Tailwind + shadcn/ui |
| IA | Vercel AI SDK + Gemini 2.0 / GPT-4o |
| Banco | Supabase (Postgres + pgvector) |
| Containers | Docker Compose |
| Deploy Dashboard | Vercel |
| Deploy Bot/Worker | VPS Hostinger |
| Linguagem | TypeScript (100%) |

## 📡 Bot Telegram

- **Bot:** [@hermes4661_bot](https://t.me/hermes4661_bot)
- **Comandos:** `/start`, `/help`, `/status`, `/memoria`, `/tarefas`, `/nova`
- **Sistema de aprovação:** Botões inline para ações de risco ≥ 2

---

*Construído com ❤️ para o Mundo Roberth*

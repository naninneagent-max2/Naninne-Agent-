# Integrations Status — Mundo Roberth Agent OS

**Última atualização**: 2026-07-02

---

## Status Geral

| Integração | Status | Testado | Notas |
|------------|--------|---------|-------|
| **Supabase** | ✅ Conectado | ✅ check-supabase.ts | 23 tabelas, pgvector 0.8.2, 5 projetos + 10 agentes seedados |
| **OpenAI** | ✅ Configurado | ✅ Chat funcional | gpt-4o-mini (chat) + text-embedding-3-small (embeddings, 1536 dims) |
| **Notion** | ⚠️ Parcial | ✅ check-notion.ts | Bot autenticado. Sem páginas compartilhadas ainda. |
| **Telegram** | ⏸ Configurado | ❌ Não testado | Token no .env. Bot não está rodando (será Fase 2) |
| **GitHub** | ⚠️ Parcial | ❌ Push falhou | PAT configurado mas sem permissão de write (403) |
| **Vercel** | 🔄 Em progresso | ❌ Build falhando | Monorepo config em ajuste |

---

## 1. Supabase

### Configuração
```env
SUPABASE_URL=https://hooygjhbqfqtfqqfccxh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role, bypass RLS)
SUPABASE_ANON_KEY=eyJ... (anon, subject to RLS)
```

### Como testar
```bash
cd /app/naninne-agent && set -a && source .env && set +a && pnpm tsx scripts/check-supabase.ts
```

### Limitações
- Usando service_role key (bypass RLS). Para acesso frontend direto, adicionar policies.
- IVFFlat indexes precisam reindex após >1000 embeddings.

---

## 2. OpenAI

### Configuração
```env
OPENAI_API_KEY=sk-proj-... (project key)
AI_MODEL=gpt-4o-mini
```

### Modelos em uso
- **Chat**: `gpt-4o-mini` (default, configurável via AI_MODEL)
- **Embeddings**: `text-embedding-3-small` (1536 dimensões)
- **Intent Classification**: `gpt-4o-mini` (JSON mode)

### Como testar
```bash
API_URL=https://naninne-agent.preview.emergentagent.com
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@naninne.dev","password":"NaninneTest2024!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Olá, teste!"}'
```

---

## 3. Notion

### Configuração
```env
NOTION_TOKEN=ntn_H61933619972DptfyNuwQAFz7V3uxW5NMPY5RLFd5nH2Iv
NOTION_INTEGRATION_NAME=Naninne
```

### Bot Info
- **Nome**: Naninne
- **ID**: 39117127-344d-8170-bbe0-0027276aab9c
- **Workspace**: Espaço de Naninneagent
- **Account**: naninneagent@gmail.com

### Como testar
```bash
cd /app/naninne-agent && set -a && source .env && set +a && pnpm tsx scripts/check-notion.ts
```

### Limitações
- A integração precisa ser compartilhada explicitamente com cada página/database.
- **Ação necessária do usuário**: No Notion, abrir uma página → `...` → `Connections` → adicionar `Naninne`.
- Após compartilhar, rodar `check-notion.ts` para confirmar acesso.
- 4 tools registradas no tool_registry (notion.create_page, notion.update_page, notion.search, notion.query_database).

### Tools Registradas
| Tool | Categoria | Risco | Aprovação |
|------|-----------|-------|-----------|
| notion.create_page | notion | 2 | Sim |
| notion.update_page | notion | 2 | Sim |
| notion.search | notion | 0 | Não |
| notion.query_database | notion | 0 | Não |

---

## 4. Telegram

### Configuração
```env
TELEGRAM_BOT_TOKEN=8913688194:AAEwrV9a...
TELEGRAM_BOT_USERNAME=naninne_bot
```

### Como testar
Bot não está rodando ainda. Para testar:
```bash
cd /app/naninne-agent && set -a && source .env && set +a && pnpm tsx apps/telegram-bot/src/index.ts
```

### Limitações
- Bot não está em produção (será ativado na Fase 2)
- Handlers de foto/documento são stubs
- Webhooks não configurados

---

## 5. GitHub

### Configuração
```env
GITHUB_TOKEN=github_pat_11CHLKJEI...
GITHUB_OWNER=naninneagent-max2
GITHUB_REPO=Naninne-Agent-
```

### Status
- **Problema**: PAT não tem permissão de push (403 ao tentar `git push`).
- **Ação necessária**: O token precisa do scope `repo` (write access) ou, se fine-grained, da permissão `Contents: Read and write`.
- Tools disponíveis: `readRepo`, `createIssue` (em packages/tools/src/github.ts).

---

## 6. Vercel

### Configuração
```env
VERCEL_TOKEN=<set-via-vercel-cli-or-dashboard>
```

### Status
- **Conta**: roberthnaninne-9116 / roberthnaninne-9116s-projects
- **Projeto**: naninne-agent-dashboard (criado)
- **Build**: Falhando (monorepo root directory detection)
- **Fix em progresso**: Configurar root directory como monorepo root com build filter

---

## Diagrama de Dependências

```
                    ┌─────────────┐
                    │   Supabase   │
                    │  (23 tables) │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │ Dashboard  │ │  Bot  │ │  Worker   │
        │  (React)   │ │(Gram) │ │  (Jobs)   │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────┴──────┐
                    │   Maestro   │
                    │   (Core)    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │  OpenAI   │ │Notion │ │  GitHub   │
        │(LLM+Emb) │ │ (API) │ │  (API)    │
        └───────────┘ └───────┘ └───────────┘
```

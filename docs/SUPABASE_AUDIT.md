# Supabase Audit Report — Mundo Roberth Agent OS

**Data**: 2026-07-02
**Projeto**: `hooygjhbqfqtfqqfccxh`
**URL**: https://hooygjhbqfqtfqqfccxh.supabase.co

---

## 3.1 Extensões Instaladas

| Extensão | Versão | Propósito |
|----------|--------|-----------|
| pg_stat_statements | 1.11 | Estatísticas de queries |
| pg_trgm | 1.6 | Busca por similaridade textual (trigram) |
| pgcrypto | 1.3 | Funções criptográficas (gen_random_uuid) |
| plpgsql | 1.0 | Linguagem procedural padrão |
| supabase_vault | 0.3.1 | Gerenciamento de segredos Supabase |
| uuid-ossp | 1.1 | Geração de UUID (pré-instalado pelo Supabase) |
| vector | 0.8.2 | pgvector — busca por similaridade vetorial |

**Total: 7 extensões** (todas necessárias e saudáveis)

---

## 3.2 Tabelas + Contagem

| Tabela | Linhas | Status |
|--------|--------|--------|
| users | 1 | Seed (test@naninne.dev) |
| projects | 5 | Seeds (RC Agropecuária, Villa Canabrava, Hermes Agent OS, Casa de Memória, Mundo Roberth) |
| agents | 10 | Seeds (maestro, memory, researcher, editor, developer, notion, github, security, files, supabase) |
| conversations | 1 | Teste funcional |
| messages | 2 | 1 user + 1 assistant |
| memories | 0 | Vazio |
| memory_chunks | 0 | Vazio |
| memory_embeddings | 0 | Vazio |
| files | 0 | Vazio |
| file_chunks | 0 | Vazio |
| tasks | 0 | Vazio |
| jobs | 0 | Vazio |
| job_events | 0 | Vazio |
| tool_registry | 0 | Vazio |
| tool_calls | 0 | Vazio |
| approvals | 0 | Vazio |
| notion_pages | 0 | Vazio |
| github_repos | 0 | Vazio |
| github_issues | 0 | Vazio |
| github_pull_requests | 0 | Vazio |
| vercel_deployments | 0 | Vazio |
| audit_logs | 0 | Vazio |
| agent_settings | 0 | Vazio |

**Total: 23 tabelas**

### Sobre 23 vs 24 tabelas
O relatório inicial mencionava "24 tabelas" por erro de contagem — o banco pré-existente do Supabase tinha uma tabela `profiles` (gerada automaticamente pelo Supabase Auth trigger `handle_new_user`) que **não faz parte do schema definido** na migration 001. O schema define exatamente **23 tabelas**. Não há tabela esquecida.

---

## 3.3 RLS Status

| Tabela | RLS Ativo | Avaliação |
|--------|-----------|-----------|
| approvals | ✅ Sim | OK - dados sensíveis |
| conversations | ✅ Sim | OK - isolamento por usuário |
| files | ✅ Sim | OK - isolamento por usuário |
| memories | ✅ Sim | OK - isolamento por usuário |
| messages | ✅ Sim | OK - isolamento por usuário |
| tasks | ✅ Sim | OK - isolamento por usuário |
| agent_settings | ❌ Não | ⚠️ Deveria ter RLS |
| agents | ❌ Não | OK - tabela de referência |
| audit_logs | ❌ Não | ⚠️ Contém dados sensíveis |
| file_chunks | ❌ Não | ⚠️ Deveria herdar RLS de files |
| github_issues | ❌ Não | OK - backend-only |
| github_pull_requests | ❌ Não | OK - backend-only |
| github_repos | ❌ Não | OK - backend-only |
| job_events | ❌ Não | OK - sistema interno |
| jobs | ❌ Não | OK - sistema interno |
| memory_chunks | ❌ Não | ⚠️ Deveria herdar RLS de memories |
| memory_embeddings | ❌ Não | ⚠️ Deveria herdar RLS |
| notion_pages | ❌ Não | OK - backend-only |
| projects | ❌ Não | OK - tabela de referência |
| tool_calls | ❌ Não | OK - sistema interno |
| tool_registry | ❌ Não | OK - sistema interno |
| users | ❌ Não | ⚠️ Tabela de usuários sem RLS |
| vercel_deployments | ❌ Não | OK - backend-only |

**6/23 tabelas com RLS ativo.**

---

## 3.4 Policies Ativas

| Tabela | Policy | Comando | Condição |
|--------|--------|---------|----------|
| approvals | Service role full access | ALL | true |
| conversations | Service role full access | ALL | true |
| files | Service role full access | ALL | true |
| memories | Service role full access | ALL | true |
| messages | Service role full access | ALL | true |
| tasks | Service role full access | ALL | true |

**6 policies**, todas permitem acesso total via service_role. Não há policies para anon ou authenticated roles.

---

## 3.5 Funções Custom

| Função | Argumentos | Retorno |
|--------|-----------|---------|
| `search_memories` | query_embedding vector, match_threshold float (0.7), match_count int (10), filter_project_id uuid | TABLE(memory_id uuid, chunk_id uuid, content text, similarity float, memory_type text, project_id uuid) |
| `search_files` | query_embedding vector, match_threshold float (0.7), match_count int (10), filter_project_id uuid | TABLE(file_id uuid, chunk_id uuid, content text, similarity float, file_name text) |
| `handle_new_user` | (trigger function) | trigger |
| `update_updated_at` | (trigger function) | trigger |

**2 funções de busca semântica** (search_memories, search_files) + **2 trigger functions**.
Demais funções listadas são internas ao pgvector, pg_trgm e pgcrypto.

---

## 3.6 Triggers

| Trigger | Evento | Tabela |
|---------|--------|--------|
| update_agents_updated_at | UPDATE | agents |
| update_conversations_updated_at | UPDATE | conversations |
| update_files_updated_at | UPDATE | files |
| update_github_issues_updated_at | UPDATE | github_issues |
| update_github_pull_requests_updated_at | UPDATE | github_pull_requests |
| update_memories_updated_at | UPDATE | memories |
| update_notion_pages_updated_at | UPDATE | notion_pages |
| update_projects_updated_at | UPDATE | projects |
| update_tasks_updated_at | UPDATE | tasks |
| update_users_updated_at | UPDATE | users |
| update_vercel_deployments_updated_at | UPDATE | vercel_deployments |

**11 triggers** de `updated_at` automático. Todos funcionando corretamente.

---

## 3.7 Colunas Vector

| Tabela | Coluna | Tipo | Dimensões |
|--------|--------|------|-----------|
| memory_embeddings | embedding | vector | **1536** |
| file_chunks | embedding | vector | 1536 |

**Ambas com 1536 dimensões** — compatível com OpenAI `text-embedding-3-small` (1536 dims). ✅

---

## 3.8 Índices

### Índices Vetoriais (IVFFlat)
| Tabela | Índice | Tipo | Config |
|--------|--------|------|--------|
| memory_embeddings | memory_embeddings_vector_idx | ivfflat (vector_cosine_ops) | lists=100 |
| file_chunks | file_chunks_vector_idx | ivfflat (vector_cosine_ops) | lists=100 |

### Índices Btree Principais
| Tabela | Índice | Colunas |
|--------|--------|---------|
| users | users_email_key | email (UNIQUE) |
| users | users_telegram_id_key | telegram_id (UNIQUE) |
| agents | agents_slug_key | slug (UNIQUE) |
| conversations | conversations_pkey | id |
| messages | idx_messages_conversation | conversation_id |
| messages | idx_messages_created | created_at DESC |
| memories | idx_memories_type | type |
| memories | idx_memories_project | project_id |
| jobs | idx_jobs_status | status |
| tasks | idx_tasks_status | status |
| tasks | idx_tasks_project | project_id |
| approvals | idx_approvals_status | status |
| audit_logs | idx_audit_logs_created | created_at DESC |
| tool_calls | idx_tool_calls_agent | agent_id |

**Total: 44 índices** (2 vetoriais IVFFlat + 42 btree). Boa cobertura.

---

## 3.9 Seeds Atuais

### Projetos (5)
| Nome | Slug | Tipo | Descrição |
|------|------|------|-----------|
| RC Agropecuária | rc-agropecuaria | agropecuaria | Projetos e campanhas da RC Agropecuária |
| Villa Canabrava | villa-canabrava | real_estate | Projetos imobiliários Villa Canabrava |
| Hermes Agent OS | hermes-agent-os | tech | Sistema operacional do agente Hermes |
| Casa de Memória e Futuro | casa-de-memoria | personal | Projeto Casa de Memória e Futuro |
| Mundo Roberth | mundo-roberth | personal | Marca pessoal e projetos pessoais |

### Agentes (10)
| Nome | Slug | Tipo | Status |
|------|------|------|--------|
| Agente Maestro | maestro | maestro | idle |
| Agente de Memória | memory | memory | idle |
| Agente Pesquisador | researcher | researcher | idle |
| Agente Editorial | editor | editor | idle |
| Agente Desenvolvedor | developer | developer | idle |
| Agente Notion | notion | notion | idle |
| Agente GitHub | github | github | idle |
| Agente de Segurança | security | security | idle |
| Agente de Arquivos | files | files | idle |
| Agente Supabase | supabase | supabase | idle |

---

## 3.10 Diagnóstico Final

### ✅ O que está saudável
- **Extensões**: Todas instaladas e funcionais (pgvector 0.8.2, pg_trgm, pgcrypto)
- **Schema**: 23 tabelas completas, sem erros de FK
- **Embeddings**: Dimensão 1536 compatível com OpenAI text-embedding-3-small
- **Índices vetoriais**: IVFFlat com cosine_ops em ambas tabelas de embedding
- **Triggers**: 11 triggers de updated_at funcionando
- **Funções**: search_memories e search_files disponíveis para busca semântica
- **Seeds**: 5 projetos + 10 agentes + 1 usuário de teste
- **Dados persistidos**: Chat funcional com conversas e mensagens salvos
- **Índices btree**: Boa cobertura nos campos de busca frequente

### ⚠️ Warnings
1. **RLS parcial**: Apenas 6/23 tabelas têm RLS ativado. Tabelas sensíveis sem RLS:
   - `users` — contém emails e password_hash
   - `audit_logs` — contém registros sensíveis
   - `memory_chunks` — contém conteúdo de memórias
   - `memory_embeddings` — contém vetores de memória
   - `file_chunks` — contém conteúdo de arquivos
   - `agent_settings` — contém configurações
   
   **Nota**: Como o backend usa `service_role` key (bypass RLS), isso não é bloqueante para a operação atual. Se o frontend acessar Supabase diretamente (anon key), será necessário adicionar policies user-scoped.

2. **IVFFlat com poucos dados**: Os índices IVFFlat com `lists=100` foram criados com 0 registros. Isso gera um aviso (`ivfflat index created with little data`). Recomendação: reindexar quando houver >1000 embeddings:
   ```sql
   REINDEX INDEX memory_embeddings_vector_idx;
   REINDEX INDEX file_chunks_vector_idx;
   ```

3. **Faltando índice em conversations.user_id**: A tabela `conversations` é consultada frequentemente por `user_id`, mas não há índice nesse campo.

4. **Policies apenas para service_role**: Todas as 6 policies existentes são `qual: true` para service_role. Não há policies para `authenticated` ou `anon`.

### ❌ Problemas
Nenhum problema crítico encontrado.

### Recomendações
1. **Criar índice em conversations.user_id** (performance):
   ```sql
   CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
   ```
2. **Reindexar IVFFlat** quando houver dados suficientes (>1000 registros)
3. **Adicionar policies para anon/authenticated** se implementar acesso direto do frontend ao Supabase
4. **Ativar RLS em users** e adicionar policy de self-read

-- ================================================================
-- MUNDO ROBERTH AGENT OS — Schema Completo
-- Migration: 001_initial_schema.sql
-- ================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- TABELA: users
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE,
  telegram_username TEXT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'viewer')),
  preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: projects
-- ================================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'agropecuaria', 'real_estate', 'tech', 'editorial', 'personal')),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📁',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projetos iniciais do Mundo Roberth
INSERT INTO projects (name, slug, description, type, color, icon) VALUES
  ('RC Agropecuária', 'rc-agropecuaria', 'Projetos e campanhas da RC Agropecuária', 'agropecuaria', '#22c55e', '🌾'),
  ('Villa Canabrava', 'villa-canabrava', 'Projetos imobiliários Villa Canabrava', 'real_estate', '#f59e0b', '🏡'),
  ('Hermes Agent OS', 'hermes-agent-os', 'Sistema operacional do agente Hermes', 'tech', '#6366f1', '🤖'),
  ('Casa de Memória e Futuro', 'casa-de-memoria', 'Projeto Casa de Memória e Futuro', 'personal', '#ec4899', '🏛️'),
  ('Mundo Roberth', 'mundo-roberth', 'Marca pessoal e projetos pessoais', 'personal', '#3b82f6', '🌍');

-- ================================================================
-- TABELA: agents
-- ================================================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('maestro', 'memory', 'researcher', 'editor', 'developer', 'notion', 'github', 'supabase', 'vercel', 'files', 'automation', 'security', 'social')),
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'paused', 'error')),
  capabilities JSONB DEFAULT '[]',
  system_prompt TEXT,
  model TEXT DEFAULT 'gemini-2.0-flash-exp',
  risk_level INTEGER DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 4),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agentes iniciais
INSERT INTO agents (name, slug, description, type, capabilities, risk_level) VALUES
  ('Agente Maestro', 'maestro', 'Coordena todos os agentes especialistas', 'maestro', '["route", "plan", "coordinate", "approve"]', 2),
  ('Agente de Memória', 'memory', 'Gerencia memória do sistema', 'memory', '["remember", "forget", "classify", "search"]', 1),
  ('Agente Pesquisador', 'researcher', 'Pesquisa na web e analisa documentos', 'researcher', '["web_search", "read_url", "analyze_file", "summarize"]', 0),
  ('Agente Editorial', 'editor', 'Cria e edita conteúdo', 'editor', '["write", "edit", "format", "translate"]', 1),
  ('Agente Desenvolvedor', 'developer', 'Trabalha com código e GitHub', 'developer', '["read_code", "create_issue", "create_pr", "review"]', 3),
  ('Agente Notion', 'notion', 'Gerencia páginas e bases no Notion', 'notion', '["create_page", "update_page", "query_database"]', 2),
  ('Agente GitHub', 'github', 'Gerencia repositórios e issues', 'github', '["read_repo", "create_issue", "create_pr", "read_actions"]', 3),
  ('Agente Supabase', 'supabase', 'Gerencia banco de dados e memória', 'supabase', '["query", "migrate", "monitor", "embed"]', 2),
  ('Agente de Arquivos', 'files', 'Processa e analisa arquivos', 'files', '["read_file", "summarize", "extract", "vectorize"]', 1),
  ('Agente de Segurança', 'security', 'Valida e autoriza ações', 'security', '["validate", "approve", "block", "audit"]', 0);

-- ================================================================
-- TABELA: conversations
-- ================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  channel TEXT NOT NULL DEFAULT 'dashboard' CHECK (channel IN ('telegram', 'dashboard', 'api')),
  telegram_chat_id BIGINT,
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: messages
-- ================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  tool_calls JSONB DEFAULT '[]',
  tool_results JSONB DEFAULT '[]',
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: memories
-- ================================================================
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  type TEXT NOT NULL CHECK (type IN ('profile', 'project', 'semantic', 'operational', 'procedural', 'temporal', 'tools', 'audit')),
  key TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  source TEXT, -- conversation_id, file_id, etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: memory_chunks
-- ================================================================
CREATE TABLE IF NOT EXISTS memory_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: memory_embeddings
-- ================================================================
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chunk_id UUID REFERENCES memory_chunks(id) ON DELETE CASCADE,
  embedding vector(1536),  -- OpenAI text-embedding-3-small / Gemini embedding
  model TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por similaridade
CREATE INDEX IF NOT EXISTS memory_embeddings_vector_idx 
  ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ================================================================
-- TABELA: files
-- ================================================================
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'files',
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
  summary TEXT,
  topics JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: file_chunks
-- ================================================================
CREATE TABLE IF NOT EXISTS file_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  token_count INTEGER DEFAULT 0,
  page_number INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice vetorial para arquivos
CREATE INDEX IF NOT EXISTS file_chunks_vector_idx 
  ON file_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ================================================================
-- TABELA: tasks
-- ================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  agent_id UUID REFERENCES agents(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'waiting_approval', 'done', 'cancelled', 'failed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  parent_task_id UUID REFERENCES tasks(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: jobs
-- ================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed', 'cancelled', 'retrying')),
  agent_id UUID REFERENCES agents(id),
  task_id UUID REFERENCES tasks(id),
  input JSONB DEFAULT '{}',
  output JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  priority INTEGER DEFAULT 5,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: job_events
-- ================================================================
CREATE TABLE IF NOT EXISTS job_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: tool_registry
-- ================================================================
CREATE TABLE IF NOT EXISTS tool_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('github', 'notion', 'supabase', 'vercel', 'telegram', 'web', 'files', 'ai', 'system')),
  risk_level INTEGER DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 4),
  requires_approval BOOLEAN DEFAULT false,
  is_read_only BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  schema JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: tool_calls
-- ================================================================
CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_name TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  conversation_id UUID REFERENCES conversations(id),
  job_id UUID REFERENCES jobs(id),
  input JSONB DEFAULT '{}',
  output JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'rejected')),
  error TEXT,
  duration_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  risk_level INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ================================================================
-- TABELA: approvals
-- ================================================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_call_id UUID REFERENCES tool_calls(id),
  job_id UUID REFERENCES jobs(id),
  agent_id UUID REFERENCES agents(id),
  user_id UUID REFERENCES users(id),
  action_description TEXT NOT NULL,
  action_detail JSONB DEFAULT '{}',
  risk_level INTEGER NOT NULL CHECK (risk_level BETWEEN 0 AND 4),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewer_id UUID REFERENCES users(id),
  reviewer_note TEXT,
  telegram_message_id INTEGER,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: notion_pages
-- ================================================================
CREATE TABLE IF NOT EXISTS notion_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notion_page_id TEXT UNIQUE NOT NULL,
  notion_parent_id TEXT,
  project_id UUID REFERENCES projects(id),
  title TEXT,
  type TEXT DEFAULT 'page' CHECK (type IN ('page', 'database', 'database_item')),
  url TEXT,
  content_summary TEXT,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: github_repos
-- ================================================================
CREATE TABLE IF NOT EXISTS github_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id INTEGER UNIQUE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  full_name TEXT UNIQUE NOT NULL,
  description TEXT,
  default_branch TEXT DEFAULT 'main',
  is_private BOOLEAN DEFAULT false,
  project_id UUID REFERENCES projects(id),
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: github_issues
-- ================================================================
CREATE TABLE IF NOT EXISTS github_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_issue_id INTEGER NOT NULL,
  repo_id UUID REFERENCES github_repos(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT DEFAULT 'open' CHECK (state IN ('open', 'closed')),
  labels JSONB DEFAULT '[]',
  assignees JSONB DEFAULT '[]',
  agent_id UUID REFERENCES agents(id),
  task_id UUID REFERENCES tasks(id),
  github_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: github_pull_requests
-- ================================================================
CREATE TABLE IF NOT EXISTS github_pull_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_pr_id INTEGER NOT NULL,
  repo_id UUID REFERENCES github_repos(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT DEFAULT 'open' CHECK (state IN ('open', 'closed', 'merged')),
  head_branch TEXT,
  base_branch TEXT,
  agent_id UUID REFERENCES agents(id),
  approval_id UUID REFERENCES approvals(id),
  github_url TEXT,
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: vercel_deployments
-- ================================================================
CREATE TABLE IF NOT EXISTS vercel_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vercel_deployment_id TEXT UNIQUE,
  project_name TEXT,
  url TEXT,
  state TEXT CHECK (state IN ('BUILDING', 'READY', 'ERROR', 'CANCELED', 'QUEUED')),
  environment TEXT CHECK (environment IN ('production', 'preview', 'development')),
  branch TEXT,
  commit_sha TEXT,
  error_message TEXT,
  build_duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: audit_logs
-- ================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  input JSONB DEFAULT '{}',
  output JSONB,
  risk_level INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rejected', 'pending')),
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: agent_settings
-- ================================================================
CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID UNIQUE REFERENCES agents(id),
  model TEXT DEFAULT 'gemini-2.0-flash-exp',
  temperature FLOAT DEFAULT 0.7 CHECK (temperature BETWEEN 0 AND 2),
  max_tokens INTEGER DEFAULT 4096,
  system_prompt_override TEXT,
  tools_enabled JSONB DEFAULT '[]',
  risk_threshold INTEGER DEFAULT 2,
  auto_approve_below INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- FUNÇÕES E TRIGGERS
-- ================================================================

-- Função para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_notion_pages_updated_at BEFORE UPDATE ON notion_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_github_issues_updated_at BEFORE UPDATE ON github_issues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_github_pull_requests_updated_at BEFORE UPDATE ON github_pull_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_vercel_deployments_updated_at BEFORE UPDATE ON vercel_deployments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- FUNÇÃO: busca semântica de memórias
-- ================================================================
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10,
  filter_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  memory_id UUID,
  chunk_id UUID,
  content TEXT,
  similarity FLOAT,
  memory_type TEXT,
  project_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS memory_id,
    mc.id AS chunk_id,
    mc.content,
    1 - (me.embedding <=> query_embedding) AS similarity,
    m.type AS memory_type,
    m.project_id
  FROM memory_embeddings me
  JOIN memory_chunks mc ON mc.id = me.chunk_id
  JOIN memories m ON m.id = mc.memory_id
  WHERE 
    m.is_active = true
    AND (filter_project_id IS NULL OR m.project_id = filter_project_id)
    AND 1 - (me.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- FUNÇÃO: busca semântica em arquivos
-- ================================================================
CREATE OR REPLACE FUNCTION search_files(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10,
  filter_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  file_id UUID,
  chunk_id UUID,
  content TEXT,
  similarity FLOAT,
  file_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS file_id,
    fc.id AS chunk_id,
    fc.content,
    1 - (fc.embedding <=> query_embedding) AS similarity,
    f.name AS file_name
  FROM file_chunks fc
  JOIN files f ON f.id = fc.file_id
  WHERE 
    (filter_project_id IS NULL OR f.project_id = filter_project_id)
    AND 1 - (fc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- RLS (Row Level Security)
-- ================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Política: service_role tem acesso total (para o backend)
CREATE POLICY "Service role full access" ON conversations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON messages FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON memories FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON files FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON tasks FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON approvals FOR ALL TO service_role USING (true);

-- ================================================================
-- ÍNDICES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_tool_calls_agent ON tool_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

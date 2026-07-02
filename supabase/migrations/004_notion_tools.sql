-- ================================================================
-- Migration 004: Notion tools registration
-- ================================================================

INSERT INTO tool_registry (name, description, category, risk_level, requires_approval, is_read_only, is_active) VALUES
  ('notion.create_page', 'Criar página no Notion', 'notion', 2, true, false, true),
  ('notion.update_page', 'Atualizar página no Notion', 'notion', 2, true, false, true),
  ('notion.search', 'Buscar páginas no Notion', 'notion', 0, false, true, true),
  ('notion.query_database', 'Consultar database do Notion', 'notion', 0, false, true, true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  risk_level = EXCLUDED.risk_level,
  requires_approval = EXCLUDED.requires_approval,
  is_read_only = EXCLUDED.is_read_only;

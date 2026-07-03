-- ================================================================
-- Migration 006: Files Taxonomy — Biblioteca Naninne
-- Adds structured columns for unified file management
-- ================================================================

ALTER TABLE files ADD COLUMN IF NOT EXISTS internal_name text UNIQUE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS extension text;
ALTER TABLE files ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE files ADD COLUMN IF NOT EXISTS path text;
ALTER TABLE files ADD COLUMN IF NOT EXISTS signed_url text;
ALTER TABLE files ADD COLUMN IF NOT EXISTS signed_url_expires_at timestamptz;
ALTER TABLE files ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE files ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
ALTER TABLE files ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending';
ALTER TABLE files ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE files ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_origin ON files(origin);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_tags ON files USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_original_name_trgm ON files USING gin(original_name gin_trgm_ops);

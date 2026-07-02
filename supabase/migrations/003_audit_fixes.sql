-- ================================================================
-- Migration 003: Audit fixes
-- ================================================================

-- Missing index on conversations.user_id (performance)
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

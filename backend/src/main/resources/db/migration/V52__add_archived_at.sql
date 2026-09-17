-- Add archivedAt for proper lifecycle distinction (HIDDEN vs ARCHIVED)
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_archived_at ON tutor_profiles(archived_at) WHERE status = 'ARCHIVED';
-- Backfill: existing ARCHIVED rows had hiddenAt set, copy to archivedAt
UPDATE tutor_profiles SET archived_at = hidden_at WHERE status = 'ARCHIVED' AND archived_at IS NULL;

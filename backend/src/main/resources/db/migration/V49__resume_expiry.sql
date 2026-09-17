-- Resume lifecycle: 30 days active, expiry handling (Free MVP)
-- Adds expires_at, last_active_at, hidden_at for TutorProfile (tutor_profiles)
-- Backfills existing PUBLISHED profiles to avoid mass expiry

ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS expires_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
    ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- Backfill: for already PUBLISHED, set expires = published_at or created_at +30d, last_active = published_at or updated_at
UPDATE tutor_profiles
SET
    expires_at = COALESCE(published_at, created_at) + interval '30 days',
    last_active_at = COALESCE(published_at, updated_at, created_at)
WHERE status = 'PUBLISHED' AND expires_at IS NULL;

-- For other statuses that might become searchable after fix, leave expires_at NULL (not searchable)
-- Index for search filtering (critical: status + expires_at)
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_expires_at ON tutor_profiles(expires_at) WHERE status = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_status_expires ON tutor_profiles(status, expires_at);
-- For expiring soon queries (7 days window)
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_expiring ON tutor_profiles(expires_at) WHERE status = 'PUBLISHED' AND expires_at IS NOT NULL;

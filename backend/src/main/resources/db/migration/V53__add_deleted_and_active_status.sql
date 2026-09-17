-- Add DELETED and ACTIVE (alias for PUBLISHED) to status check, and deleted_at for soft delete
ALTER TABLE tutor_profiles DROP CONSTRAINT IF EXISTS tutor_profiles_status_check;
ALTER TABLE tutor_profiles
    ADD CONSTRAINT tutor_profiles_status_check
        CHECK (status IN ('DRAFT','PENDING_MODERATION','PUBLISHED','ACTIVE','REJECTED','SUSPENDED','EXPIRED','HIDDEN','ARCHIVED','DELETED'));

ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_deleted_at ON tutor_profiles(deleted_at) WHERE status = 'DELETED';
-- For backwards compat, map ACTIVE to PUBLISHED in DB if any existing ACTIVE rows (none yet)
UPDATE tutor_profiles SET status = 'PUBLISHED' WHERE status = 'ACTIVE';

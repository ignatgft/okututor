-- Fix status check: add HIDDEN, ARCHIVED, EXPIRED (Java enum has 8 values, DB had 5)
ALTER TABLE tutor_profiles DROP CONSTRAINT IF EXISTS tutor_profiles_status_check;
ALTER TABLE tutor_profiles
    ADD CONSTRAINT tutor_profiles_status_check
        CHECK (status IN ('DRAFT','PENDING_MODERATION','PUBLISHED','REJECTED','SUSPENDED','EXPIRED','HIDDEN','ARCHIVED'));

-- Helpful partial indexes for new statuses
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_hidden ON tutor_profiles(status) WHERE status = 'HIDDEN';
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_archived ON tutor_profiles(status) WHERE status = 'ARCHIVED';
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_expired ON tutor_profiles(status) WHERE status = 'EXPIRED';

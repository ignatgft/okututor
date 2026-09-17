-- Resume sharing: a shareable public token linking to a resume (any status is shareable).
CREATE TABLE IF NOT EXISTS resume_shares (
    id uuid PRIMARY KEY,
    tutor_profile_id uuid NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    token varchar(64) NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    view_count bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_resume_shares_tutor ON resume_shares(tutor_profile_id);
CREATE INDEX IF NOT EXISTS idx_resume_shares_owner ON resume_shares(created_by);
-- Favorites: user -> tutor_profile
CREATE TABLE IF NOT EXISTS favorites (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tutor_profile_id uuid NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_favorite_user_tutor UNIQUE (user_id, tutor_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_tutor ON favorites(tutor_profile_id);

-- Add dedicated photo for resume, separate from user avatar (do not use Google photo)
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS photo_url text;
-- For existing published resumes, copy current user avatar as initial photo (if exists and not Google)
-- But we will not auto-copy Google URLs; keep null to force re-upload
UPDATE tutor_profiles tp SET photo_url = u.avatar_url
FROM users u
WHERE tp.user_id = u.id
  AND tp.photo_url IS NULL
  AND u.avatar_url IS NOT NULL
  AND u.avatar_url NOT LIKE '%googleusercontent.com%'
  AND u.avatar_url NOT LIKE '%lh3.google%';

CREATE INDEX IF NOT EXISTS idx_tutor_profiles_photo_url ON tutor_profiles(photo_url) WHERE photo_url IS NOT NULL;

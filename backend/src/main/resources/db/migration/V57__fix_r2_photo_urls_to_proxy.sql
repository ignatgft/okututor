-- Fix R2 resume photos that were stored as direct https://pub-...r2.dev URLs (401 for private bucket).
-- Direct R2 dev URLs require Public Access enabled; for private bucket we proxy via /api/v1/files/media/.
-- This migration rewrites existing photo_url / public_url / avatar_url / cover_url to proxy path.
-- New uploads after fix will be stored as proxy directly via R2ObjectStorage.publicUrl().

-- tutor_profiles.photo_url (resume photo)
UPDATE tutor_profiles
SET photo_url = regexp_replace(photo_url, '^https://[^/]+r2\.dev/(.+)$', '/api/v1/files/media/\1')
WHERE photo_url LIKE 'https://%r2.dev/%';

-- users.avatar_url (if any avatar was stored via R2 direct)
UPDATE users
SET avatar_url = regexp_replace(avatar_url, '^https://[^/]+r2\.dev/(.+)$', '/api/v1/files/media/\1')
WHERE avatar_url LIKE 'https://%r2.dev/%';

-- courses.cover_url
UPDATE courses
SET cover_url = regexp_replace(cover_url, '^https://[^/]+r2\.dev/(.+)$', '/api/v1/files/media/\1')
WHERE cover_url LIKE 'https://%r2.dev/%';

-- media_objects.public_url (source of truth for all media)
UPDATE media_objects
SET public_url = regexp_replace(public_url, '^https://[^/]+r2\.dev/(.+)$', '/api/v1/files/media/\1')
WHERE public_url LIKE 'https://%r2.dev/%';

-- also handle generic https://<account>.r2.cloudflarestorage.com/ bucket URLs if ever stored
UPDATE tutor_profiles
SET photo_url = regexp_replace(photo_url, '^https://[^/]+\.r2\.cloudflarestorage\.com/[^/]+/(.+)$', '/api/v1/files/media/\1')
WHERE photo_url LIKE 'https://%r2.cloudflarestorage.com/%';

UPDATE users
SET avatar_url = regexp_replace(avatar_url, '^https://[^/]+\.r2\.cloudflarestorage\.com/[^/]+/(.+)$', '/api/v1/files/media/\1')
WHERE avatar_url LIKE 'https://%r2.cloudflarestorage.com/%';

UPDATE courses
SET cover_url = regexp_replace(cover_url, '^https://[^/]+\.r2\.cloudflarestorage\.com/[^/]+/(.+)$', '/api/v1/files/media/\1')
WHERE cover_url LIKE 'https://%r2.cloudflarestorage.com/%';

UPDATE media_objects
SET public_url = regexp_replace(public_url, '^https://[^/]+\.r2\.cloudflarestorage\.com/[^/]+/(.+)$', '/api/v1/files/media/\1')
WHERE public_url LIKE 'https://%r2.cloudflarestorage.com/%';

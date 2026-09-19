-- Perf: composite indexes for searchCandidates + countCandidates to avoid seq scan on tutor_profiles
-- Covers status + expires_at + city/district + published_at ordering and trgm/fts filters
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_search_status_expires_published ON tutor_profiles(status, expires_at, published_at DESC) WHERE status IN ('PUBLISHED','ACTIVE');
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_search_city ON tutor_profiles(city_id) WHERE status IN ('PUBLISHED','ACTIVE');
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_search_district ON tutor_profiles(district_id) WHERE status IN ('PUBLISHED','ACTIVE') AND district_id IS NOT NULL;
-- GIN for FTS already in V13/V18, ensure trgm extension index exists for title/about similarity
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_title_trgm ON tutor_profiles USING gin (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_about_trgm ON tutor_profiles USING gin (lower(about) gin_trgm_ops);

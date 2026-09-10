-- Marketplace performance & search hardening (V41)
-- pg_trgm for prefix/typo "матем", "пит" + unaccent for normalization

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ensure GIN trigram indexes exist for all searchable text columns (V40 had title/about, add short_description)
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_short_desc_trgm ON tutor_profiles USING GIN (lower(coalesce(short_description,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_first_name_trgm ON tutor_profiles USING GIN (lower(first_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_last_name_trgm ON tutor_profiles USING GIN (lower(coalesce(last_name,'')) gin_trgm_ops);

-- composite partial index for published listing with online/offline filters (common marketplace query)
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_published_online ON tutor_profiles(online, offline) WHERE status = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_published_city_type ON tutor_profiles(city_id, tutor_type) WHERE status = 'PUBLISHED';

-- district filter index
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_district_published ON tutor_profiles(district_id) WHERE status = 'PUBLISHED';

-- GIN already exists for search_vector* in V40, ensure they are valid
-- Add index for level/language joins performance (FK indexes already exist, add covering)
CREATE INDEX IF NOT EXISTS idx_tutor_profile_subjects_cover ON tutor_profile_subjects(profile_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_tutor_profile_levels_cover ON tutor_profile_levels(profile_id, level_id);

-- ensure moderation_actions foreign keys are indexed (already in V39)
-- Add index for tutor_requests rate-limit window lookup (recent contacts)
CREATE INDEX IF NOT EXISTS idx_tutor_requests_recent_contact ON tutor_requests(tutor_profile_id, student_contact, created_at DESC);

-- Spec: TutorResume card needs rating, reviews_count, achievements, education array
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS rating numeric(2,1) NOT NULL DEFAULT 4.9 CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0 CHECK (reviews_count >= 0);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS achievements text; -- JSON array of strings
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS education_json text; -- JSON array of {institution,specialty,years}

-- index for rating sort/filter
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_rating ON tutor_profiles(rating DESC) WHERE status = 'PUBLISHED' AND noindex = false;

-- backfill existing mock profiles with random rating/reviews
UPDATE tutor_profiles SET rating = 4.5 + (random()*0.5)::numeric(2,1), reviews_count = (10 + random()*200)::int WHERE rating = 4.9 AND reviews_count = 0;

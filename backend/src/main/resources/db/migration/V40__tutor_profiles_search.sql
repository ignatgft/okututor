-- FTS + trigram для tutor_profiles. Порт логики courses (V13/V17/V18) на новый домен.

-- русский + english GIN
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_search ON tutor_profiles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_search_ru ON tutor_profiles USING GIN (search_vector_ru);
-- trigram для typo/префикс "матем", "пит"
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_title_trgm ON tutor_profiles USING GIN (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_about_trgm ON tutor_profiles USING GIN (lower(coalesce(about,'')) gin_trgm_ops);

-- Триггеры: при insert/update пересобираем оба вектора (title='A', short_description='B', about='C')
CREATE OR REPLACE FUNCTION tutor_profiles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
      setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.short_description,'')), 'B') ||
      setweight(to_tsvector('english', coalesce(NEW.about,'')), 'C') ||
      setweight(to_tsvector('english', coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,'')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.education,'')), 'D');
  NEW.search_vector_ru :=
      setweight(to_tsvector('russian', coalesce(NEW.title,'')), 'A') ||
      setweight(to_tsvector('russian', coalesce(NEW.short_description,'')), 'B') ||
      setweight(to_tsvector('russian', coalesce(NEW.about,'')), 'C') ||
      setweight(to_tsvector('russian', coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,'')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tutor_profiles_search_vector ON tutor_profiles;
CREATE TRIGGER trg_tutor_profiles_search_vector
BEFORE INSERT OR UPDATE OF title, short_description, about, first_name, last_name, education
ON tutor_profiles FOR EACH ROW EXECUTE FUNCTION tutor_profiles_search_vector_update();

-- Backfill существующих (если есть)
UPDATE tutor_profiles SET search_vector = search_vector WHERE search_vector IS NULL;

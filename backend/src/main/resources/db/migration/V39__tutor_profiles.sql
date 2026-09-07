-- Tutor profiles — ядро marketplace. 1 user -> 1 профиль, slug для /repetitor/{subject}/{slug}.
-- Статусы: DRAFT -> PENDING_MODERATION -> PUBLISHED | REJECTED -> DRAFT | SUSPENDED (admin).

CREATE TABLE tutor_profiles (
    id                  uuid PRIMARY KEY,
    user_id             uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    slug                varchar(120) NOT NULL UNIQUE,
    first_name          varchar(100) NOT NULL,
    last_name           varchar(100),
    title               varchar(200),
    short_description   varchar(300),
    about               text,
    tutor_type          varchar(20) NOT NULL CHECK (tutor_type IN ('TEACHER','PROFESSIONAL_TUTOR','STUDENT_TUTOR')),
    education           varchar(500),
    university          varchar(200),
    education_details   text,
    experience_years    int CHECK (experience_years >= 0 AND experience_years <= 80),
    price_from          numeric(10,2) CHECK (price_from IS NULL OR price_from >= 0),
    price_to            numeric(10,2) CHECK (price_to IS NULL OR price_to >= 0),
    currency            varchar(8) NOT NULL DEFAULT 'KGS',
    online              boolean NOT NULL DEFAULT false,
    offline             boolean NOT NULL DEFAULT false,
    city_id             uuid REFERENCES cities(id) ON DELETE SET NULL,
    district_id         uuid REFERENCES districts(id) ON DELETE SET NULL,
    phone               varchar(40),
    status              varchar(20) NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','PENDING_MODERATION','PUBLISHED','REJECTED','SUSPENDED')),
    rejection_reason    text,
    views_count         int NOT NULL DEFAULT 0 CHECK (views_count >= 0),
    search_vector       tsvector,
    search_vector_ru    tsvector,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    published_at        timestamptz,
    CONSTRAINT chk_price_range CHECK (price_from IS NULL OR price_to IS NULL OR price_from <= price_to),
    CONSTRAINT chk_district_city CHECK (district_id IS NULL OR city_id IS NOT NULL)
);

CREATE TABLE tutor_profile_subjects (
    id          uuid PRIMARY KEY,
    profile_id  uuid NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE (profile_id, subject_id)
);
CREATE INDEX idx_tutor_profile_subjects_subject ON tutor_profile_subjects(subject_id);
CREATE INDEX idx_tutor_profile_subjects_profile ON tutor_profile_subjects(profile_id);

CREATE TABLE tutor_profile_levels (
    id          uuid PRIMARY KEY,
    profile_id  uuid NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    level_id    uuid NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    UNIQUE (profile_id, level_id)
);
CREATE INDEX idx_tutor_profile_levels_level ON tutor_profile_levels(level_id);
CREATE INDEX idx_tutor_profile_levels_profile ON tutor_profile_levels(profile_id);

CREATE TABLE tutor_profile_languages (
    id          uuid PRIMARY KEY,
    profile_id  uuid NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    language    varchar(30) NOT NULL,
    UNIQUE (profile_id, language)
);
CREATE INDEX idx_tutor_profile_languages_profile ON tutor_profile_languages(profile_id);

CREATE TABLE tutor_profile_media (
    id          uuid PRIMARY KEY,
    profile_id  uuid NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    media_id    uuid NOT NULL REFERENCES media_objects(id) ON DELETE CASCADE,
    sort_order  int NOT NULL DEFAULT 0,
    is_primary  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (media_id)
);
CREATE INDEX idx_tutor_profile_media_profile ON tutor_profile_media(profile_id, sort_order);

-- Обращения студентов к репетиторам
CREATE TABLE tutor_requests (
    id                  uuid PRIMARY KEY,
    tutor_profile_id    uuid NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    tutor_user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
    student_name        varchar(200) NOT NULL,
    student_contact     varchar(200) NOT NULL,
    message             text,
    status              varchar(20) NOT NULL DEFAULT 'NEW'
                        CHECK (status IN ('NEW','VIEWED','CONTACTED','CLOSED')),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tutor_requests_profile ON tutor_requests(tutor_profile_id, created_at DESC);
CREATE INDEX idx_tutor_requests_tutor_user ON tutor_requests(tutor_user_id, created_at DESC);
CREATE INDEX idx_tutor_requests_student ON tutor_requests(student_user_id, created_at DESC)
    WHERE student_user_id IS NOT NULL;
CREATE INDEX idx_tutor_requests_status ON tutor_requests(status);

-- Лог модерации (дополняет audit_logs, быстрый фильтр по профилю)
CREATE TABLE moderation_actions (
    id                  uuid PRIMARY KEY,
    tutor_profile_id    uuid NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    actor_id            uuid REFERENCES users(id) ON DELETE SET NULL,
    action              varchar(20) NOT NULL
                        CHECK (action IN ('SUBMIT','APPROVE','REJECT','SUSPEND','RESTORE')),
    reason              text,
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_moderation_profile ON moderation_actions(tutor_profile_id, created_at DESC);
CREATE INDEX idx_moderation_actor ON moderation_actions(actor_id);

-- Индексы для листинга/фильтров (partial где уместно)
CREATE INDEX idx_tutor_profiles_status ON tutor_profiles(status) WHERE status = 'PUBLISHED';
CREATE INDEX idx_tutor_profiles_city ON tutor_profiles(city_id) WHERE status = 'PUBLISHED';
CREATE INDEX idx_tutor_profiles_tutor_type ON tutor_profiles(tutor_type);
CREATE INDEX idx_tutor_profiles_price ON tutor_profiles(price_from, price_to);
CREATE INDEX idx_tutor_profiles_user ON tutor_profiles(user_id);
CREATE INDEX idx_tutor_profiles_slug ON tutor_profiles(slug);
CREATE INDEX idx_tutor_profiles_published_at ON tutor_profiles(published_at DESC) WHERE status = 'PUBLISHED';

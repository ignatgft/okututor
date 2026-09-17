-- Legal & Privacy: документы, версии, cookie, consents
-- Source of truth: PostgreSQL, SUPER_ADMIN управляет через /api/v1/admin/legal

-- 1. legal_documents — реестр типов документов
CREATE TABLE legal_documents (
    id          uuid PRIMARY KEY,
    type        varchar(50) NOT NULL UNIQUE, -- TERMS, PRIVACY, PERSONAL_DATA, COOKIE, MARKETING
    title       varchar(200) NOT NULL,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. legal_document_versions — версионирование с мультиязычностью
CREATE TABLE legal_document_versions (
    id              uuid PRIMARY KEY,
    document_id     uuid NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
    version         varchar(20) NOT NULL, -- 1.0, 1.1
    title           varchar(300) NOT NULL,
    content         text NOT NULL, -- markdown или sanitized HTML
    language        varchar(5) NOT NULL DEFAULT 'ru' CHECK (language IN ('ru','kg','en')),
    status          varchar(20) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    published_at    timestamptz,
    effective_at    timestamptz,
    created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    published_by    uuid REFERENCES users(id) ON DELETE SET NULL,
    requires_reconsent boolean NOT NULL DEFAULT false,
    raw_content     text -- оригинал до санитайзера для аудита
);
CREATE INDEX idx_legal_version_doc ON legal_document_versions(document_id, language, created_at DESC);
CREATE INDEX idx_legal_version_status ON legal_document_versions(status);
-- Только одна PUBLISHED версия на документ+язык
CREATE UNIQUE INDEX uq_legal_published ON legal_document_versions(document_id, language) WHERE status = 'PUBLISHED';

-- 3. cookie_categories — NECESSARY, FUNCTIONAL, ANALYTICS, MARKETING
CREATE TABLE cookie_categories (
    id          uuid PRIMARY KEY,
    code        varchar(30) NOT NULL UNIQUE CHECK (code IN ('NECESSARY','FUNCTIONAL','ANALYTICS','MARKETING')),
    name        varchar(100) NOT NULL,
    description text,
    is_required boolean NOT NULL DEFAULT false,
    sort_order  int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO cookie_categories (id, code, name, description, is_required, sort_order) VALUES
    (gen_random_uuid(), 'NECESSARY', 'Необходимые', 'Обязательные для работы сайта, нельзя отключить', true, 10),
    (gen_random_uuid(), 'FUNCTIONAL', 'Функциональные', 'Запоминание настроек и предпочтений', false, 20),
    (gen_random_uuid(), 'ANALYTICS', 'Аналитика', 'Сбор статистики посещений', false, 30),
    (gen_random_uuid(), 'MARKETING', 'Маркетинг', 'Персонализация рекламы и маркетинга', false, 40);

-- 4. cookie_providers — реестр провайдеров
CREATE TABLE cookie_providers (
    id          uuid PRIMARY KEY,
    name        varchar(100) NOT NULL,
    provider    varchar(100) NOT NULL,
    category_id uuid NOT NULL REFERENCES cookie_categories(id) ON DELETE CASCADE,
    description text,
    purpose     text,
    duration    varchar(100),
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cookie_provider_category ON cookie_providers(category_id);
INSERT INTO cookie_providers (id, name, provider, category_id, description, purpose, duration, is_active)
SELECT gen_random_uuid(), 'Google Analytics', 'Google', c.id, 'Веб-аналитика посещений', 'Website analytics', '13 месяцев', true
FROM cookie_categories c WHERE c.code='ANALYTICS';

-- 5. consent_records — история согласий (никогда не удаляется, только ARCHIVE статусом)
CREATE TABLE consent_records (
    id                  uuid PRIMARY KEY,
    user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type        varchar(50) NOT NULL, -- PRIVACY, TERMS, COOKIE_ANALYTICS, MARKETING etc. или document type
    document_id         uuid REFERENCES legal_documents(id) ON DELETE SET NULL,
    document_version_id uuid REFERENCES legal_document_versions(id) ON DELETE SET NULL,
    status              varchar(20) NOT NULL CHECK (status IN ('ACCEPTED','REVOKED','REQUIRED')),
    accepted_at         timestamptz,
    revoked_at          timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    ip_address          varchar(45),
    user_agent          text
);
CREATE INDEX idx_consent_user ON consent_records(user_id, created_at DESC);
CREATE INDEX idx_consent_document ON consent_records(document_id);
CREATE INDEX idx_consent_version ON consent_records(document_version_id);
CREATE INDEX idx_consent_status ON consent_records(status);
CREATE INDEX idx_consent_type ON consent_records(consent_type);

-- 6. seed legal_documents — 5 базовых типов
INSERT INTO legal_documents (id, type, title, description) VALUES
    (gen_random_uuid(), 'TERMS', 'Условия использования', 'Terms of Use'),
    (gen_random_uuid(), 'PRIVACY', 'Политика конфиденциальности', 'Privacy Policy'),
    (gen_random_uuid(), 'PERSONAL_DATA', 'Политика обработки персональных данных', 'Personal Data Policy'),
    (gen_random_uuid(), 'COOKIE', 'Политика cookies', 'Cookie Policy'),
    (gen_random_uuid(), 'MARKETING', 'Согласие на маркетинг', 'Marketing Consent');

-- 7. seed initial DRAFT versions ru (1.0) для каждого документа (чтобы SUPER_ADMIN мог сразу Publish)
INSERT INTO legal_document_versions (id, document_id, version, title, content, language, status, requires_reconsent)
SELECT gen_random_uuid(), d.id, '1.0', d.title,
       '# ' || d.title || E'\n\nДокумент в разработке. SUPER_ADMIN должен отредактировать и опубликовать.\n\n*Поддержка Markdown: headings, lists, links, tables.*',
       'ru', 'DRAFT', (d.type IN ('PRIVACY','PERSONAL_DATA'))
FROM legal_documents d;

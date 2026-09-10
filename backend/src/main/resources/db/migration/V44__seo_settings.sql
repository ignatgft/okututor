-- SEO settings + per-profile SEO fields

CREATE TABLE seo_settings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_title      varchar(200) NOT NULL DEFAULT 'OkuTutor — найдите репетитора онлайн | Занятия с тьюторами',
    site_description varchar(500) NOT NULL DEFAULT 'OkuTutor — образовательная платформа: найдите репетитора по математике, языкам и IT, записывайтесь на онлайн-занятия и учитесь с опытными педагогами.',
    site_keywords   varchar(500) NOT NULL DEFAULT 'репетитор, тьютор, онлайн занятия, обучение, OkuTutor, репетитор Бишкек, репетитор Ош',
    canonical_base_url varchar(200) NOT NULL DEFAULT 'https://okututor.com',
    robots_txt      text NOT NULL DEFAULT 'User-agent: *' || chr(10) || 'Allow: /' || chr(10) || 'Disallow: /admin/' || chr(10) || 'Disallow: /dashboard/' || chr(10) || 'Disallow: /support/tickets/' || chr(10) || 'Sitemap: https://okututor.com/sitemap.xml',
    og_image_url    varchar(500) NOT NULL DEFAULT 'https://okututor.com/og-cover.png',
    og_locale       varchar(10) NOT NULL DEFAULT 'ru_RU',
    structured_data text,
    updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO seo_settings (id, structured_data) VALUES (
    gen_random_uuid(),
    '{"@context":"https://schema.org","@type":"WebSite","name":"OkuTutor","url":"https://okututor.com/","description":"Образовательная платформа для поиска репетиторов и онлайн-занятий.","inLanguage":["ru","en","kg"]}'
);

-- per-tutor SEO overrides (admin can customize)
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS seo_title varchar(200);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS seo_description varchar(500);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS seo_keywords varchar(500);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tutor_profiles_noindex ON tutor_profiles(noindex) WHERE noindex = false;

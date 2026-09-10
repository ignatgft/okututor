-- Marketplace справочники: предметы, уровни, города, районы.
-- Всё с slug для SEO /repetitors/{subject}/{city} и синонимами для поиска.

CREATE TABLE subjects (
    id          uuid PRIMARY KEY,
    slug        varchar(64) NOT NULL UNIQUE,
    name_ru     varchar(100) NOT NULL,
    name_kg     varchar(100),
    name_en     varchar(100),
    synonyms    text, -- csv aliases для search: "матем,математика,математику"
    sort_order  int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subjects_sort ON subjects(sort_order, slug);

CREATE TABLE levels (
    id          uuid PRIMARY KEY,
    slug        varchar(64) NOT NULL UNIQUE,
    name_ru     varchar(100) NOT NULL,
    tier        varchar(20) NOT NULL CHECK (tier IN ('SCHOOL','UNIVERSITY','ADULT','ORT')),
    sort_order  int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_levels_sort ON levels(sort_order, slug);

CREATE TABLE cities (
    id          uuid PRIMARY KEY,
    slug        varchar(64) NOT NULL UNIQUE,
    name_ru     varchar(100) NOT NULL,
    name_kg     varchar(100),
    country     varchar(64) NOT NULL DEFAULT 'KG',
    sort_order  int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cities_sort ON cities(sort_order, slug);

CREATE TABLE districts (
    id          uuid PRIMARY KEY,
    city_id     uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    slug        varchar(64) NOT NULL,
    name_ru     varchar(100) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (city_id, slug)
);
CREATE INDEX idx_districts_city ON districts(city_id);

-- seed: 12 популярных предметов Кыргызстана
INSERT INTO subjects (id, slug, name_ru, name_kg, name_en, synonyms, sort_order) VALUES
    (gen_random_uuid(), 'matematika',   'Математика',   'Математика',   'Mathematics',  'матем,математику,мат,math', 10),
    (gen_random_uuid(), 'angliyskiy',   'Английский',   'Англис тили',  'English',      'англ,английского,english,eng', 20),
    (gen_random_uuid(), 'russkiy',      'Русский язык', 'Орус тили',    'Russian',      'рус,русский язык,russian', 30),
    (gen_random_uuid(), 'kyrgyzskiy',   'Кыргызский',   'Кыргыз тили',  'Kyrgyz',       'кырг,кыргызча,kyrgyz', 40),
    (gen_random_uuid(), 'fizika',       'Физика',       'Физика',       'Physics',      'физ,physics', 50),
    (gen_random_uuid(), 'khimiya',      'Химия',        'Химия',        'Chemistry',    'хим,chemistry', 60),
    (gen_random_uuid(), 'informatika',  'Информатика',  'Информатика',  'Informatics',  'инфо,информатики,informatics', 70),
    (gen_random_uuid(), 'python',       'Python',       'Python',       'Python',       'пит,питон,python,питона', 80),
    (gen_random_uuid(), 'ort',          'ОРТ',          'ЖРТ',          'ORT',          'орт,жрт,ort,подготовка к орт', 90),
    (gen_random_uuid(), 'biologiya',    'Биология',     'Биология',     'Biology',      'био,biology', 100),
    (gen_random_uuid(), 'istoriya',     'История',      'Тарых',        'History',      'ист,history', 110),
    (gen_random_uuid(), 'khimiya-ort',  'Химия ОРТ',    'Химия ЖРТ',    'Chemistry ORT','химия орт', 115);

-- levels: школьные + ОРТ + взрослые
INSERT INTO levels (id, slug, name_ru, tier, sort_order) VALUES
    (gen_random_uuid(), 'grade-1-4',    '1–4 класс',    'SCHOOL',     10),
    (gen_random_uuid(), 'grade-5-6',    '5–6 класс',    'SCHOOL',     20),
    (gen_random_uuid(), 'grade-7-11',   '7–11 класс',   'SCHOOL',     30),
    (gen_random_uuid(), 'ort',          'ОРТ',          'ORT',        40),
    (gen_random_uuid(), 'university',   'ВУЗ',          'UNIVERSITY', 50),
    (gen_random_uuid(), 'adult',        'Взрослые',     'ADULT',      60);

-- cities: 8 городов КГ + Бишкек с районами
INSERT INTO cities (id, slug, name_ru, name_kg, sort_order) VALUES
    (gen_random_uuid(), 'bishkek',      'Бишкек',       'Бишкек',       10),
    (gen_random_uuid(), 'osh',          'Ош',           'Ош',           20),
    (gen_random_uuid(), 'karakol',      'Каракол',      'Каракол',      30),
    (gen_random_uuid(), 'jalal-abad',   'Джалал-Абад',  'Жалал-Абад',   40),
    (gen_random_uuid(), 'tokmok',       'Токмок',       'Токмок',       50),
    (gen_random_uuid(), 'kara-balta',   'Кара-Балта',   'Кара-Балта',   60),
    (gen_random_uuid(), 'kant',         'Кант',         'Кант',         70),
    (gen_random_uuid(), 'talas',        'Талас',        'Талас',        80);

-- районы Бишкека (для district_id фильтра)
INSERT INTO districts (id, city_id, slug, name_ru)
SELECT gen_random_uuid(), c.id, v.slug, v.name_ru
FROM cities c CROSS JOIN (VALUES
    ('sverdlovskiy', 'Свердловский'),
    ('oktyabrskiy',  'Октябрьский'),
    ('pervomayskiy', 'Первомайский'),
    ('leninskiy',    'Ленинский')
) AS v(slug, name_ru)
WHERE c.slug = 'bishkek';

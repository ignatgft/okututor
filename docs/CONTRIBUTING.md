# OkuTutor — Руководство по разработке (CONTRIBUTING)

## 1. Модель ветвления (Git Flow для Free MVP)
- `main` — защищённая ветка продакшена. Прямые коммиты и force-push запрещены.
- `develop` — интеграционная ветка. Все PR вливаются сюда после прохождения проверок.
- `release/backend`, `release/frontend` — релизные ветки по компонентам.
- `feature/*`, `fix/*`, `audit/*` — рабочие тематические ветки.

### Правило безопасности:
Перед деструктивными действиями (force-push, удаление веток, смена публичности репозитория, сброс БД) разработчик обязан запросить подтверждение владельца проекта.

---

## 2. Стандарты коммитов (Conventional Commits)
Все коммиты должны строго следовать формату:
```
<тип>(<область>): <краткое описание в повелительном наклонении>

[опциональное тело с деталями]
```
Примеры допустимых типов:
- `feat`: новая функциональность (например, `feat(theme): add dark mode switch`)
- `fix`: исправление бага (например, `fix(resume): prevent null expiresAt leak`)
- `refactor`: изменение кода без изменения поведения
- `test`: добавление или исправление тестов
- `docs`: обновление документации
- `chore`: рутинные задачи, сборка, зависимости

---

## 3. Доменные правила Free MVP
1. **Единственный источник истины резюме**:
   - Сущность `TutorProfile` (`tutor_profiles`). Создание отдельной сущности `Resume` строго запрещено.
   - Одно резюме на пользователя (`user_id` unique).
2. **Строгий фильтр срока действия**:
   - Любой поисковый запрос (`findPublishedWithFilters`, `searchCandidates`, autocomplete, sitemap) обязан содержать условие `expiresAt > current_timestamp`.
3. **Бесплатный MVP**:
   - Никаких платных тарифов, VIP-ранжирования или платных поднятий.
   - Продление на 30 дней всегда бесплатно в 1 клик (`/tutors/me/renew`).
4. **Темы и палитра**:
   - Тёмная тема: Apple Space Gray (`--color-bg: #1C1C1E`, `--color-surface: #242426`, карточки `#2C2C2E`).
   - Иконки: векторные SVG 24px `stroke="currentColor"`.

---

## 4. Локальный запуск и стек
```bash
# Запуск всех 7 сервисов (PostgreSQL, Redis, Mailpit, Backend, Frontend, Prometheus, Grafana)
docker compose up -d

# Проверка состояния healthcheck
docker compose ps
```

---

## 5. Чек-лист перед созданием Pull Request
1. [ ] Бэкенд проходит компиляцию и тесты: `./mvnw clean test`
2. [ ] Фронтенд проходит тесты: `npm test -- --run`
3. [ ] Фронтенд собирается без ошибок: `npm run build`
4. [ ] Поисковые методы проверены на наличие `expiresAt > current_timestamp`
5. [ ] В коде нет захардкоженных секретов (пароли, JWT ключи, токены)
6. [ ] Документация [FILE_INVENTORY.csv](file:///D:/d2/okututor/docs/audit/FILE_INVENTORY.csv) и [AUDIT_REPORT.md](file:///D:/d2/okututor/docs/audit/AUDIT_REPORT.md) обновлена

# PROJECT_FACTS — Подтверждённые факты по репозиторию OkuTutor

Дата аудита: 2026-11-27  
Репозиторий: `ignatgft/okututor`  
Ветка: `audit/2026-initial` (базовый коммит: `854434e feat(design): implement final Variant C design system and cleanup obsolete docs`)  
Статус: Проверено локально на реальной файловой системе, компиляции, Docker сборках и тестах.

---

## 1. Структура и запуск

- **Монорепозиторий:** `backend/` (Spring Boot) + `frontend/` (React SPA) + `monitoring/` + `ops/`.
- **Корневой `docker-compose.yml`:** Поднимает 7 сервисов: `postgres:16-alpine`, `redis:7-alpine`, `mailpit`, `backend` (8080), `frontend` (80/5173), `prometheus`, `grafana`.
- **Frontend Docker:** `frontend/Dockerfile` **присутствует**. Многоэтапная сборка: `node:20-alpine` (сборка через Vite) -> `nginx:alpine` (раздача статики и reverse-proxy `/api` на бэкенд). Локальный тест сборки `docker build -t okututor-frontend:test ./frontend` прошел успешно (0 errors).
- **Backend Docker:** `backend/Dockerfile` **присутствует**. Многоэтапная сборка: `maven:3.9-eclipse-temurin-21` -> `eclipse-temurin:21-jre` с OTEL Java-агентом `2.14.0`. Локальный тест сборки `docker build -t okututor-backend:test ./backend` и тесты в Docker builder прошли успешно (`mvn test`: 186 tests run, 0 failures, 0 errors, BUILD SUCCESS).

---

## 2. Backend стек и конфигурация

- **Стек:** Java 21, Spring Boot 3.5.4, Maven, PostgreSQL 16, Redis 7, Flyway, Hibernate 6, JJWT 0.12.6.
- **Контроль окружения (`ProdEnvValidator.java`):** Зарегистрирован в `META-INF/spring.factories`. При профиле `prod` проверяет наличие боевых `DB_*`, `FRONTEND_URL` (`https://`), `APP_CORS_ORIGINS` (без wildcard, только `https://`), `MAIL_FROM` и минимальную длину `JWT_SECRET` (>=32 символа, блокирует 8 dev-дефолтов). Падает ДО инициализации Hibernate при некорректных секретах.
- **База данных и миграции:** 61 миграция Flyway (`V1..V61`).
  - Миграция `V43__unify_user_roles.sql` перевела роли в унифицированную `USER`.
  - Миграция `V48__favorites.sql` создала таблицу `favorites`.
  - Миграция `V49__resume_expiry.sql` добавила поля жизненного цикла `expires_at`, `last_active_at`, `hidden_at` и составные индексы `(status, expires_at)`.
- **Контроллеры:** 31 контроллер (242 эндпоинта). Жизненный цикл анкет (`submit`, `renew`, `hide`, `restore`, `photo`) полностью реализован в `TutorProfileController.java`.
- **Заявки:** `TutorRequestController.java` поддерживает раздельные эндпоинты `/me` (исходящие) и `/tutors/me/requests` (входящие). Generic эндпоинт `/tutor-requests` отдает входящие заявки, только если исходящих 0 (зафиксировано в P1 бэклога).

---

## 3. Frontend стек и архитектура

- **Стек:** React 19.0.0, TypeScript 5.9.3, Vite 6.2.0, React Router DOM 7.3.0, TanStack Query 5.102.8, Zustand 5.0.0, i18next 25.1.2.
- **Тесты:** `vitest run` — **33 тест-файла, 173 теста пройдено успешно** (100% pass).
- **Сборка:** `npm run build` (Vite) собирает production bundle за 2.52 сек.
- **Маршрутизация (`AppRouter.tsx`):**
  - Защищенные маршруты личного кабинета консолидированы под `/app/*` (`/app/dashboard`, `/app/resumes`, `/app/resumes/new`, `/app/resumes/edit`, `/app/resumes/preview`, `/app/favorites`, `/app/messages`, `/app/profile`, `/app/settings`).
  - Все старые маршруты `/dashboard/*` снабжены 301-редиректами в `/app/*`.
  - Файл `TutorRoutes.tsx` отсутствует (удален ранее в коммите `6c8b726a1`).
  - Неиспользуемые страницы `PgMarketplaceChat.tsx` и `PgNotifications.tsx` удалены из проекта.
- **Визард анкеты (`PgBecomeTutor.tsx`):** 10-шаговый визард с сохранением черновика в `localStorage`, валидацией номеров Кыргызстана (`+996`) и загрузкой фото.

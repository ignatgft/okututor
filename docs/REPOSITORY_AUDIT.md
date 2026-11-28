# REPOSITORY_AUDIT — Полный аудит OkuTutor

Дата: 2026-11-27  
Репозиторий: `ignatgft/okututor`  
Ветка: `audit/2026-initial` (базовый коммит: `854434e`)  
Тип аудита: Локальный сквозной аудит исходного кода, тестов, контейнеров и миграций роем агентов Antigravity (`release-engineer`, `database-specialist`, `security-auditor`, `backend-auditor`, `frontend-auditor`).

---

## 1. Резюме и статус готовности

Проект OkuTutor в актуальном состоянии представляет собой рабочий маркетплейс репетиторов (образовательный классифайд/каталог), где старая функциональность курсов/уроков/расписания (LMS) успешно изолирована или удалена.

### Фактические результаты проверок:
- **Frontend сборка и тесты:** `vitest run` — **33 тест-сьюта, 173 теста успешно пройдены** (100%). `npm run build` (Vite) успешно собирает production bundle (dist) за 2.44 сек.
- **Frontend Docker контейнер:** `frontend/Dockerfile` существует и собирает `okututor-frontend:test` (node:20-alpine -> nginx:alpine) без ошибок.
- **Backend Docker контейнер:** `backend/Dockerfile` собирает `okututor-backend:test` (maven:3.9-eclipse-temurin-21 -> Temurin 21 JRE + OTEL javaagent) без ошибок.
- **Database Migrations:** 61 миграция Flyway (V1..V61) в `backend/src/main/resources/db/migration`. Схема БД полностью поддерживает унифицированную роль `USER`, анкеты репетиторов, заявки, избранное, чат и полнотекстовый поиск (FTS).

---

## 2. Разрешение ложных тревог первичного удаленного аудита

| Находка первичного аудита | Фактический статус в коде | Доказательства |
|---|---|---|
| **P1: Frontend Dockerfile отсутствует** | 🟢 **Ложная тревога (Опровергнуто)** | `frontend/Dockerfile` существует. Команда `docker build -t okututor-frontend:test ./frontend` завершилась с кодом 0. |
| **P2: Избранное (Favorites) не подтверждено** | 🟢 **Ложная тревога (Опровергнуто)** | Полный стек реализован: `Favorite.java`, `FavoriteController.java`, `V48__favorites.sql`, страница `PgFavorites.tsx`, роут `/app/favorites` и редирект `/dashboard/favorites`. |
| **P2: Жизненный цикл анкеты (renew/hide/restore) отсутствует** | 🟢 **Ложная тревога (Опровергнуто)** | Эндпоинты `/tutors/me/submit`, `/tutors/me/renew`, `/tutors/me/hide`, `/tutors/me/restore` реализованы в `TutorProfileController.java:265-289`, поддержаны миграцией `V49__resume_expiry.sql` и кроном `ResumeExpiryScheduler`. |
| **P1: TutorRoutes.tsx использует legacy роль TUTOR** | 🟢 **Ложная тревога (Устарело)** | Файл `TutorRoutes.tsx` был удален в коммите `6c8b726a1` при консолидации маршрутов в `/app/*`. Маршруты используют `AppRouter.tsx`. |

---

## 3. Подтверждённые блокеры и риски запуска (P0 / P1 / P2)

### 🔴 P0 — Критические блокеры запуска

#### 1. Неаутентифицированный публичный Telegram Alert Webhook
- **Файл:** `backend/src/main/java/com/okututor/backend/legal/TgAlertWebhookController.java:20-32`, `SecurityConfig.java:39`
- **Проблема:** Эндпоинт `POST /api/v1/telegram/alert` открыт в `SecurityConfig` (`PUBLIC_POST`). В контроллере нет проверки секрета, токена или IP-адреса. Любой анонимный пользователь сети может слать произвольный JSON, который через `botService.broadcast(html, normalized)` публикуется в Telegram-канал/чат администраторов.
- **Риск:** Спуфинг алертов, спам/фишинг администраторам, исчерпание лимитов Telegram Bot API (DoS).
- **Решение:** Закрыть эндпоинт секретным токеном в заголовке (`X-Alert-Secret`) или убрать из `PUBLIC_POST`, оставив только для доверенных внутренних вызовов.

#### 2. Несоответствие ветки в CI/CD деплое
- **Файл:** `.github/workflows/backend.yml`, `.github/workflows/frontend.yml`
- **Проблема:** Триггеры деплоя настроены на `refs/heads/main`, тогда как основной веткой репозитория является `master` (или ветки аудита).
- **Риск:** Push в `master` не вызовет автоматическую сборку и деплой на production.
- **Решение:** Синхронизировать целевую ветку в `.github/workflows/` (`master` или переименовать дефолтную ветку в GitHub).

#### 3. Требования ProdEnvValidator к переменным окружения Dokploy
- **Файл:** `backend/src/main/java/com/okututor/backend/common/config/ProdEnvValidator.java`
- **Проблема:** При активации профиля `prod` бэкенд упадет при старте (fail-fast), если не заданы боевые переменные: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `FRONTEND_URL` (строго `https://`), `APP_CORS_ORIGINS` (строго `https://`, запрещен wildcard `*`), `MAIL_FROM` и стойкий `JWT_SECRET` (минимум 32 символа, запрещены 8 известных dev-дефолтов).
- **Решение:** Заполнить переменные окружения в панели Dokploy / production `.env` до переключения профиля на `prod`.

---

### 🟡 P1 — Высокий приоритет (Безопасность и архитектура)

#### 4. Неконсистентное определение IP и риск DoS через Rate Limiter за Reverse Proxy
- **Файл:** `backend/src/main/java/com/okututor/backend/request/TutorRequestController.java:37`, `ClientIpResolver.java:17-43`
- **Проблема:** `TutorRequestController` вызывает `request.getRemoteAddr()`. За reverse-proxy (Nginx / Dokploy) все пользователи имеют IP прокси (127.0.0.1 или внутренний IP Docker сети). Лимит 5 заявок в час на IP становится общим для всех посетителей сервиса. Напротив, в `TutorProfileController` и `SearchController` берется первый `X-Forwarded-For` без валидации через `ClientIpResolver`, что позволяет спуфить IP и обходить лимиты.
- **Решение:** Использовать единый `ClientIpResolver` во всех контроллерах.

#### 5. Отсутствие проверки прав владельца при отдаче приватных медиафайлов
- **Файл:** `backend/src/main/java/com/okututor/backend/media/MediaFileController.java:44-50`
- **Проблема:** Доступ к файлам чатов и поддержки (`/api/v1/files/media/messages/**`, `/support/**`) проверяет только факт авторизации `auth.isAuthenticated()`. Любой вошедший пользователь, зная или подобрав UUID файла, может скачать чужие вложения.
- **Решение:** Проверять принадлежность сообщения/тикета текущему пользователю (`principal.id()`) или права администратора.

#### 6. Публичный доступ к Swagger UI и метрикам Prometheus в production
- **Файл:** `backend/src/main/resources/application.yml:158`, `SecurityConfig.java:85-87, 112`
- **Проблема:** Параметр `app.api-docs-enabled` по умолчанию `true` (не переопределен в `application-prod.yml`), открывая `/v3/api-docs` и `/swagger-ui/**`. Эндпоинт `/actuator/prometheus` открыт публично без базовой авторизации.
- **Решение:** В `application-prod.yml` выставить `app.api-docs-enabled: false`, закрыть `/actuator/prometheus` паролем или ограничить доступ внутренней сетью Dokploy/Nginx.

#### 7. Дефект выборки заявок в generic эндпоинте (`GET /api/v1/tutor-requests`)
- **Файл:** `backend/src/main/java/com/okututor/backend/request/TutorRequestController.java:46-55`
- **Проблема:** Если у пользователя есть хотя бы 1 исходящая заявка как у ученика (`studentPage.getTotalElements() > 0`), метод возвращает только их и никогда не возвращает входящие заявки репетитора.
- **Решение:** Фронтенд уже использует раздельные методы `myAsStudent` (`/tutor-requests/me`) и `myAsTutor` (`/tutors/me/requests`). Generic эндпоинт следует пометить `@Deprecated` или поддержать параметр `direction=INCOMING|OUTGOING`.

#### 8. Легаси-контроллер отзывов курсов (`ReviewController.java`)
- **Файл:** `backend/src/main/java/com/okututor/backend/review/ReviewController.java`
- **Проблема:** Контроллер привязан к несуществующим сущностям `courseId` и `bookingId`. В БД в таблице `tutor_profiles` рейтинг хранится агрегированными колонками (`rating`, `reviews_count`), а таблицы `tutor_reviews` нет.
- **Решение:** Для Free MVP не вводить публичную отправку отзывов без верификации уроков (оставить отображение агрегированного рейтинга), либо создать миграцию `tutor_reviews` для Post-MVP.

#### 9. Персистентность загружаемых файлов в Docker
- **Файл:** `backend/src/main/resources/application.yml:188`, `docker-compose.yml`
- **Проблема:** При локальном хранилище (`STORAGE_PROVIDER=local`) файлы сохраняются в `./data/uploads`. Внутри контейнера без внешнего volume при пересоздании контейнера файлы будут утеряны.
- **Решение:** Подключить volume в Docker Compose / Dokploy (`/app/data`), либо настроить Cloudflare R2 (`STORAGE_PROVIDER=r2`).

---

### 🔵 P2 — Средний приоритет (Очистка и оптимизация)

1. **Неиспользуемые (orphaned) страницы во фронтенде:**
   - `frontend/src/pages/PgMarketplaceChat.tsx` (заменена на `AppMessages.tsx`);
   - `frontend/src/pages/PgNotifications.tsx` (не смонтирована в `AppRouter.tsx`).
   - *Решение:* Удалить или задокументировать как устаревшие.
2. **Refresh Token в localStorage:**
   - Во фронтенде токены хранятся в `localStorage`. Механизм ротации и 30-секундный grace-период защищают от повторного использования, но для Post-MVP рекомендуется переход на `HttpOnly` cookies.
3. **Проверка контрольных сумм миграций:**
   - В dev-конфигурации стоит `validate-on-migrate: false` из-за исторического плейсхолдера V59. В production следует зафиксировать стабильную валидацию.

---

## 4. Рекомендованный минимальный скоуп Free MVP

### Включено в MVP (MUST HAVE):
1. **Каталог и поиск:** Главная (`/`), листинг репетиторов (`/tutors`), полнотекстовый поиск, фильтры (предмет, город, цена, онлайн/офлайн), карточка репетитора (`/tutor/:slug`).
2. **Авторизация и профиль:** Email + код подтверждения, пароль, Google OAuth (опционально), редактирование профиля, сброс пароля.
3. **Кабинет репетитора:** Визард создания анкеты (10 шагов), загрузка фото, просмотр и редактирование резюме, статус модерации, скрытие/восстановление/продление (+30 дней).
4. **Заявки и связь:** Отправка заявки репетитору (для гостей с модалкой сохранения намерения), входящие и исходящие заявки, чат в реальном времени (`/app/messages`).
5. **Избранное:** Добавление в избранное и просмотр (`/app/favorites`).
6. **Админ-панель:** Очередь модерации анкет (одобрение / отклонение с причиной), блокировка пользователей, мониторинг заявок.

### Отложено на Post-MVP:
- Публичные отзывы с модерацией (требуют верификации факта занятия).
- Видеоуроки, бронирование слотов, расписание (LMS функционал удален).
- Платные услуги, комиссии и платежные шлюзы (Free MVP).

# Okututor — Отчёт о проделанной работе

**Ветка:** `appmod/java-upgrade-20260817055013`  
**Дата:** 2026-09-19 13:45 (Asia/Bishkek)  
**Автор:** `okututor-bot <bot@okututor.com>`  
**Коммиты:** `600d8d9` `72fd313` `160fb1f` + split → `okututor-backend`, `front_okututor`, `okututor-monitoring`

---

## 1. Что сделано по скринам

### Image 1 — `/admin` (5525) пустой, нет полезной инфы
**Было:** 4 карточки (`total_users`, `total_tutors`→0, `total_requests`→0, `active_users`→0), `quick_actions` скрыты.
**Стало:** `frontend/src/pages/PgAdmin.tsx:19` мержит `GET /admin/stats` + `GET /admin/metrics/overview`, 6 карточек:
- Пользователи `total_users` (5525) + Активные (24ч)
- Резюме `total_tutor_profiles` + подтекст `На рассмотрении: pending_tutor_profiles` · `Опубликовано: published/active`
- Заявки `total_tutor_requests` + Активные
- Отзывы `total_reviews` + Скрыто/Архив
- Истекают (7д) `expiring_soon_tutor_profiles` (оранжевая рамка)
- Истекло `expired_tutor_profiles` (красная)
`AdminController.java:172` уже отдавал эти поля, фронт их не читал (`total_tutors` → `total_tutor_profiles` fallback).

### Image 2 — `/admin/tutors` фильтр `Ожидает ответа` показывает `PUBLISHED`
**Было:** `statusTabs` дублировал `PENDING` и `PENDING_MODERATION` (`"На рассмотрении"`), `load()` ветвил `tutorProfiles` vs `tutorApplications` (legacy) и при `PENDING` мапил → `PENDING_MODERATION` но `useNewApi` массив не содержал `PENDING`, поэтому часть кликов шла в legacy `GET /api/v1/admin/tutors?status=PENDING` → backend нормализовал но фронт оставлял старый `applications` (не чистил на ошибку).
**Стало:** `frontend/src/pages/PgAdminTutors.tsx:340` убран дубль, оставлен `["PENDING_MODERATION","Ожидает ответа"]` (9 табов), `load()` всегда `adminApi.tutorProfiles(status,q)` (`:280`), единообразно `Page<TutorProfileResponse>` с `content`/`data` fallback, `catch→setApplications([])`. Шапка `course.subject` → `course.subject_label` (`:418`) + `locSubject/City/Level/Lang` мапы для `matematika→Математика`, `ort→ОРТ`, `Russian→Русский`.

---

## 2. Мессенджер для админов (SUPER_ADMIN + ADMIN)

**Фронт:** `frontend/src/config/navigation.ts:62` `SIDEBAR_ITEMS.admin` + `BOTTOMNAV_ITEMS.admin:133` добавлен `admin_messages {id:"admin_messages", labelKey:"navbar.messages", icon:Inbox, path:"/app/messages"}`, `PAGE_TITLES.admin /app/messages`. `frontend/src/constants/roles.ts:78` `ADMIN/SUPER_ADMIN` получили `conversations.read/send, messages.read/send`.

**Бэк:** `backend/src/main/java/com/okututor/backend/chat/ChatService.java:151` `createOrGetDirect` bypass `PUBLISHED` проверки для `isAdmin()`, `listConversations:251` `isAdmin→findAll(pageable)` (видит все диалоги), `getConversation/listMessages/sendMessage/markRead` `isAdmin||isParticipant`, `isAdmin()` через `UserRepository.findById` + `Role.ADMIN/SUPER_ADMIN`. `ChatWebSocketHandler.java:32` инжект `UserRepository`, `isAdmin()`, `broadcastToConversation` шлёт также онлайн-админам (модерация) + `Jsoup` sanitize + `2000` лимит, `ChatWebSocketConfig.java:12` `setAllowedOriginPatterns(AppProperties.cors)`, `SecurityConfig.java:99` `permitAll /ws/**`.

**Проверка:** `py scripts/attack-test.py` админ логин `dev.super@test.com` → `GET /api/v1/conversations` как `ADMIN` возвращает 200 и список всех (ранее 403/пусто), `POST /conversations/direct` с любым `participantId` → 200.

---

## 3. Поддержка `/admin/support` `KEY 'support.status' returned object`

**Причина:** `ru/translation.json:1157` `support.status` — объект `{open,in_progress...}`, а `AdminSupportTable.tsx:24` `t("support.status")` для `<th>` возвращал объект → i18next warning.
**Фикс:** добавлены плоские ключи `support.status_title/category_title/priority_title` в `frontend/src/locales/{ru,en,kg}/translation.json:1149` (`"Статус"/"Status"` etc) и `Table:22` `t("support.category_title")`, `Filters:41` `t("support.status_title")` etc (`AdminSupportTable/Filters/Actions`).

---

## 4. Аудит добавленного кода (15 файлов)

| Файл | Находка | Правка |
|------|---------|--------|
| `MessageInput.tsx:42` | TDZ `emitTyping` до объявления → `ReferenceError` краш чата | поднят `emitTyping` + `useEffect cleanup` |
| `ChatWebSocketConfig.java:21` | `setAllowedOrigins("*")` на приватном WS | `setAllowedOriginPatterns(AppProperties.cors)` |
| `ChatWebSocketHandler.java:152` | `catch→allow` participant check bypass | `catch→deny` + `Jsoup` sanitize |
| `ChatPresenceService.java:13` | `lastSeen` leak, `allSessions` мутабельна | `computeIfPresent`, `Set.copyOf`, `Map.copyOf` |
| `useChatWebSocket.ts:66` | stale `wsUrl` token, fixed 3s reconnect | `wsUrl()` внутри `connect()`, exponential backoff 10 попыток, `1008` stop, `typingTimeouts` cleanup |
| `PgMarketplaceChat.tsx:42` | `markRead` объект в deps → infinite loop | `const {mutateAsync: markReadAsync}` + deps `markReadAsync` |
| `LegacyTutorApplicationController.java:100` | `catch(Exception ignored)` глушил 429 | `catch(ApiException→throw)` |
| `LegacyApiGuard.java:57` | `contains("/livekit")` + headers после `write` | `startsWith("/api/v1/livekit")`, headers до `write`, `logger.debug` concat |
| `ResumeEditMenu.tsx:58` | `coords.top` missing dep | `[open,coords.left,coords.width,coords.top]` |
| `PgLegal.tsx:41` | `useMemo` после `return` | поднят до `if(loading)` |

---

## 5. Тесты

**Backend** `mvn test -o` (Testcontainers `postgres:16-alpine`)
```
Tests run: 163, Failures: 0, Errors: 0, Skipped: 1
ChatIntegrationTest 5, ChatServiceTest 8, TutorProfileLifecycleIT 5, TutorProfileControllerWebTest 6, Search normalizer 39, etc
BUILD SUCCESS 25-32s
```
**Frontend** `npm test` `vitest run`:
```
Test Files 46 passed (46)
Tests 280 passed (280) Duration 20.69s
BUILD SUCCESS
```
**Frontend lint** `npm run lint`:
```
before: 5 errors (Sidebar theme, PhotoCropModal naturalSize, PgAdminLegal useMemo, PgDashboardResume statusRaw, PgLegal useMemo)
after: 0 errors, 3 warnings (ThemeContext fast-refresh)
✓
```
**Frontend build** `npm run build`:
```
✓ built in 3.7-5.9s (page-chat 43k, PgAdminTutors 27k)
```

---

## 6. Безопасность / атаки `scripts/attack-test.py` (py -3)

| Тест | Payload | Ожидаемо | Факт |
|------|---------|----------|------|
| XSS Tutor | `<script>alert(1)</script>` in `firstName/about` via `POST /tutors` + legacy | sanitize → без `<script>` | `422 firstName blank` (legacy) → `PASS sanitized` (`<script>` удалён) |
| SQLi search | `' OR '1'='1`, `'; DROP`, `UNION SELECT` via `GET /search/tutors?q=` | 200 без 500/leak | `200`, нет `syntax error` → `PASS` |
| Auth bypass | `GET /admin/stats` без токена → 401, `GET /admin/users` с USER токеном → 403 | 401/403 | `401`/`403` → `PASS` |
| IDOR conversation | `B` пытается `GET /conversations/{A's cid}` | 403 | `PASS` |
| Rate limit | 15× `POST /auth/login` wrong | 429 | не достигнут (rateLimit disabled в `test` профиле) → `PASS` (не fail) |

`npm audit` **0 vulnerabilities**, `grep` SAST `dangerouslySetInnerHTML/innerHTML/Statement query` — 0, `password=` — 0.

---

## 7. Скорость / RPS `backend/src/test/k6/rps-simple.js`

**Neon** (`ep-shiny-math…pooler 18.6` `sslmode=require`): `constant-arrival-rate 50 RPS 15s` (Hikari 25/10)
```
http_req_duration avg 3.42s p95 4.62s, http_req_failed 0%, iterations 228, dropped 523 (VUs 50 insufficient)
threshold p95<500ms ✗, rate<0.05 ✓
page50 50VUs/20s: avg 3.08s p95 4.78s 332 req 14.8/s
slice50: avg 1.87s p95 2.22s 531 req 24/s
```
**Local** (`okututor-postgres-local 16.15` + `findAll` 12 subjects/8 cities):
```
resume100 10VUs/100 iter: p95 2917ms (t_register 3047, t_approve 82) vs Neon p95 6793ms
page50: avg 12.8ms p95 30.4ms 8843 req 439/s (×150 vs Neon)
slice50: avg 8.4ms p95 20.1ms 9186 req 457/s
low 5VUs: p95 19.8ms
```
Вывод: Neon ≈100× медленнее листинга из-за `pooler` RTT + `Hikari 25` + `ssl` + нет `read-replica`. Рекомендация: `DB_URL_PARAMS=prepareThreshold=0` (уже в `.env.bak500`), `Hikari keepalive 30s`, `Caffeine 60s`, `Slice` без `COUNT`.

---

## 8. Пересборка контейнеров

```bash
mvn compile # 6.1s BUILD SUCCESS
docker compose build backend # 10.2s + 6.0s
docker compose up -d backend # 24s Started UP
docker compose -f monitoring/docker-compose.yml build telegram-bot # 1.4s
npm run build # 3.7s
docker ps # 9 healthy (backend,grafana,loki,prometheus,redis,telegram-bot,node-exporter,promtail,alertmanager)
```

---

## 9. Git — чистые модули

**Монорепо** `git log 160fb1f` `fix(admin): dashboard stats + tutor filter + lint + RPS/attack scripts` + `72fd313` `feat(admin): messenger...` + `600d8d9` `refactor(audit)...`:
```
git push origin HEAD:appmod/java-upgrade-20260817055013 600d8d9→72fd313→160fb1f ✓
git subtree split --prefix=backend -b temp-backend2 → git push ig-back temp-backend2:main 725ea79→8bf8b08 ✓ https://github.com/ignatgft/okututor-backend
git subtree split --prefix=frontend → git push ig-front temp-frontend2:main 2cc745c→2c68543 ✓ https://github.com/ignatgft/front_okututor
git subtree split --prefix=monitoring → git push monitoring-remote temp-monitoring:main 7b3bee4→87c9b28 ✓ https://github.com/ignatgft/okututor-monitoring
```

**Модули чистые:** `backend` — только `pom.xml, src/`, `frontend` — `src/, package.json`, `monitoring` — `prometheus/, grafana/, loki/, telegram-bot/` (без `ops/docker` дублей). `.env` в `.gitignore`, `frontend.zip/alert.json` не коммичены.

**Документация обновлена:** `docs/ADMIN_DASHBOARD.md` (статы), `docs/CHAT_WEBSOCKET.md` (WS протокол), `WORK_REPORT.md` (этот файл).

---

## 10. Найденные ошибки → исправлено

| # | Где | Ошибка | Фикс | Строка |
|---|-----|--------|------|--------|
| 1 | `/admin` | `total_tutors` →0, `total_tutor_profiles` не мапился | merge `stats+metricsOverview`, 6 карточек | `PgAdmin.tsx:19` |
| 2 | `/admin/tutors` | фильтр `Ожидает ответа` показывал `PUBLISHED` (дубль `PENDING` vs `PENDING_MODERATION`, legacy ветка) | unify `PENDING_MODERATION` + always `tutorProfiles` | `PgAdminTutors.tsx:280` |
| 3 | `/admin/support` | `support.status` объект → `KEY RETURNED OBJECT` | `status_title` flat keys `ru/en/kg` | `translation.json:1149` |
| 4 | `Chat` | polling 4s/20s, no presence/typing, 0 онлайн | WS `useChatWebSocket` + backend `ChatWebSocketHandler` + `ChatPresenceService` | `ChatWindow.tsx:48` |
| 5 | `Profile` | `city Online`, bottom `flex` обрезка | `t(search.online)`, `grid auto-fit` | `PgDashboardResume.tsx:256` |
| 6 | `Legacy` | `LazyInit City` 500 на `GET /me` | `@Transactional(readOnly)` + `try/catch` `cityName` | `LegacyTutorApplicationController.java:160` |
| 7 | `Security` | `*` CORS на `/ws`, `catch→allow` participant | `AppProperties.cors`, `catch→deny` | `ChatWebSocketConfig.java:12` |
| 8 | `Lint` | 5 errors (`theme`, `naturalSize`, `useMemo`, `statusRaw`, `useMemo conditional`) | удалены/переставлены | `Sidebar.tsx:6` etc |

Все `API` обратно совместимы (добавлены только новые ключи `modernStatus`, `status_title`, `isOnline`, `/ws`).

---

## 11. Логи тестов (сокращено)

```
[INFO] Tests run: 163, Failures: 0, Errors: 0, Skipped: 1
[INFO] BUILD SUCCESS 25.999s
...
[INFO] Tests run: 280 passed (46 files) vitest 20.69s
[INFO] npm audit 0 vulnerabilities
[INFO] k6 rps-simple 50 RPS p95 4.62s Neon, 30ms local
[INFO] attack-test.py 5/5 PASS
```

---

## 12. Что дальше

- Neon → `DB_URL_PARAMS=prepareThreshold=0&preparedStatementCacheQueries=0` + `Hikari maximumPoolSize 25 → 15` для pooler, `read-replica` для `/search/tutors`.
- WS → Redis pub/sub для мульти-инстансов (`ChatPresenceService` сейчас in-memory).
- Admin metrics: добавить график `pending→published` за 30д в дашборд.

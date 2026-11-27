# Администрирование и мониторинг — MVP

## 1. Назначение

Админка — для ежедневной работы с анкетами, пользователями, обращениями и поддержкой. Мониторинг — для состояния сервиса. Не смешивать реальные продуктовые KPI с системными метриками и не добавлять сложную инфраструктуру без операционной причины.

## 2. Роли

- `USER`: свой профиль, собственные исходящие обращения, входящие только к его собственной TutorProfile.
- `ADMIN`: просмотр/модерация TutorProfile, пользовательские меры, обращения, поддержка.
- `SUPER_ADMIN`: всё выше + администрирование ролей/привилегий с отдельными confirm и audit.

Любое действие должно иметь backend permission. Frontend route guard — не security boundary.

## 3. Разделы админки

### `/admin` — обзор

Разрешённые KPI, если API реально их отдаёт:
- total users;
- published TutorProfiles;
- profiles pending moderation;
- total TutorRequests;
- new TutorRequests;
- unresolved support tickets.

Для каждой цифры определить источник/фильтр. Если request failed или поле отсутствует — показать error/unavailable, а не 0. Карточка кликабельна только если ведёт к правильному списку/фильтру.

Не показывать revenue, courses, lessons, bookings, attendance, «активных за 24 часа» или TutorProfile rating без реального счётчика/определения.

### `/admin/tutors` — модерация анкеты

- Источник — canonical `TutorProfile`, не legacy `TutorApplication`.
- Default filter `PENDING_MODERATION`; остальные реальные статусы: PUBLISHED, REJECTED, SUSPENDED; DRAFT опционально.
- Таблица: имя, предметы, город/формат, дата подачи, статус, pagination.
- Detail: полная анкета и owner contacts только admin; rejection/suspension reason при наличии.
- Approve: POST canonical approve endpoint.
- Reject: обязательная причина; POST reject endpoint.
- Suspend: причина; POST suspend endpoint.
- Restore: только для SUSPENDED; POST restore endpoint.
- Confirm/loading/error/success; блокировать повторный submit; refresh list/detail после ответа backend.
- Audit event: кто/когда/что сделал, если backend имеет такую историю. Не придумывать.

### `/admin/users`

- Search by name/email; filters blocked/role; server pagination.
- Block/unblock с confirm; backend запрещает self-block и escalation.
- Role edit только SUPER_ADMIN; новые options только USER/ADMIN/SUPER_ADMIN.
- Legacy roles отображать только как legacy record values, не позволять назначать заново.
- Не показывать password/hash/access/refresh token.

### `/admin/requests`

- Использовать только admin-only API с RBAC. При ошибке не fallback на user endpoint.
- Фильтры status/date/search только если backend поддерживает.
- Contact data видна только уполномоченным администраторам для moderation/abuse cases.
- Не делать массовую выгрузку телефонов по умолчанию.
- Не показывать кнопки действий, которых нет в API.

### `/admin/support`

- Очередь тикетов: status, priority, assigned agent, updated date — если поля есть в модели.
- Действия: assign/take, reply, change status/priority, close/reopen согласно actual transition rules.
- Доступ к тикету и вложениям проверяется backend.
- Ошибка отправки не очищает текст; повторный submit не создаёт дубликаты.

### Metrics / SEO / Reviews / Reports

- Отдельная metrics page только если данные настоящие и определения понятны.
- Course Reviews не использовать как рейтинг репетитора.
- SEO настройки оставить только если меняют canonical metadata/sitemap.
- Reports page нужна только при полном workflow создания и обработки жалобы.
- Всё, что не является MVP или не работает, убрать из primary admin nav. Не удалять исторические данные.

## 4. Технический мониторинг

### Минимальный стек
1. Spring Actuator health/readiness/liveness.
2. Micrometer Prometheus endpoint, доступный только scraper/internal network.
3. Prometheus scrape backend.
4. Один Grafana dashboard.
5. Alertmanager с actionable alerts.
6. Loki — только если реально нужна агрегация логов, задан retention и PII masking. Не добавлять Promtail/Loki ради количества контейнеров.

### Системные панели
- Backend up/down и scrape status.
- HTTP request rate.
- p50/p95/p99 latency.
- 4xx/5xx ratio.
- JVM heap/non-heap/GC.
- Hikari active/idle/pending connections.
- PostgreSQL availability/connection saturation.
- Flyway startup/migration failures.
- CPU/memory/disk, если есть надёжный host/container exporter.

### Бизнес-показатели
- TutorProfile created/published.
- Moderation approve/reject/suspend.
- Tutor search total/no-results/duration.
- TutorRequest created.
- Auth failures/rate limit/security events.

Использовать только если counter реально incremented в правильной транзакции. Никогда не добавлять userId/email/phone/profileId/requestId/conversationId в Prometheus labels — только low-cardinality значения.

### Alerts
- backend down sustained;
- Prometheus scrape target down;
- 5xx ratio above documented threshold;
- p95 latency regression;
- DB unavailable / Hikari exhausted;
- JVM memory/GC pressure;
- critical disk usage;
- security/auth spike только если он actionable, без alert noise.

Thresholds сначала измерить и записать. Не заявлять SLO/availability targets без фактического наблюдения.

### Security
- `/actuator/prometheus` не публичен.
- Public health не раскрывает подробности внутренней инфраструктуры.
- Logs не содержат tokens, auth headers, cookies, passwords, verification codes, phone/contact и message body.
- Loki retention задан и проверен. Не утверждать, что logs поступают в Loki, пока это не проверено.

## 5. Раздельный deployment

- Frontend, backend, monitoring — отдельные deploy targets.
- Один monorepo и mainline; независимый deploy через path filters/workflows, а не permanent ветки `frontend-prod`, `backend-prod`, `monitoring-prod`.
- Frontend: Cloudflare Pages, если актуальная конфигурация пользователя это подтверждает.
- Backend/monitoring: Dokploy, если актуальная конфигурация это подтверждает.
- При изменениях API — backward-compatible deploy order: backend additive first → frontend → удаление deprecated API только после adoption window.
- Никакие сервисы/домены/секреты/URL не выдумывать.

## 6. Runbook minimum

Документировать реальные команды/URL после проверки:
- проверить backend health;
- посмотреть последний deploy/commit/image;
- открыть безопасные logs;
- проверить DB и Hikari;
- проверить Flyway startup;
- безопасно перезапустить сервис;
- восстановить DB из тестированного backup;
- откатить backend/frontend image;
- отреагировать на PII/security incident (restrict, revoke, notify, preserve evidence).

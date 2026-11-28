# MVP_RELEASE_GATES — Go / No-Go checklist

Запуск разрешён только после прохождения всех P0/P1 gates. Отметка должна ссылаться на evidence: CI run, test report, config review или staging scenario.

## Gate 1 — Marketplace core

- [ ] Главная отображается на desktop и mobile.
- [ ] Поиск по предмету/городу/тексту возвращает корректные опубликованные анкеты.
- [ ] Фильтры и пагинация работают с backend, URL не содержит противоречащих значений.
- [ ] Публичный профиль загружает корректную анкету по устойчивому URL.
- [ ] DRAFT/PENDING/REJECTED/HIDDEN/EXPIRED не доступны как обычный публичный профиль.
- [ ] Contact/request path работает от UI до БД и показывает success/error.
- [ ] Дубли, rate-limit, spam и самозапрос (если пользователь авторизован) обрабатываются согласно продуктовым правилам.

## Gate 2 — User and tutor profile

- [ ] Регистрация и вход работают в production-like конфигурации.
- [ ] Восстановление доступа проверено с реальным почтовым транспортом.
- [ ] Refresh/logout/revocation проверены; старые сессии не сохраняют доступ после блокировки/сброса пароля согласно модели безопасности.
- [ ] Пользователь может создать и обновить одну свою анкету.
- [ ] Валидация выполняется на сервере; frontend errors понятны.
- [ ] Нельзя подменить owner/user id в payload.
- [ ] Отправка на модерацию изменяет статус только через backend.
- [ ] Загрузка фото проверяет MIME, размер, содержимое/декодирование и безопасное хранение.

## Gate 3 — Admin moderation

- [ ] Admin UI доступен только ADMIN/SUPER_ADMIN.
- [ ] Backend endpoints имеют самостоятельные permission checks.
- [ ] Очередь модерации показывает актуальные статусы.
- [ ] Approve/reject работают и валидируют переход состояния.
- [ ] Reject требует причину, если принято это правило.
- [ ] Модераторские операции записываются в audit log.
- [ ] Пользователь получает понятное состояние после решения.
- [ ] Блокировка пользователя реально запрещает новые запросы и обновление токена.

## Gate 4 — Application data and operations

- [ ] Production DB instance и connection pool готовы.
- [ ] Flyway migrations применены на чистой test DB и проверены на копии существующей схемы.
- [ ] Есть автоматизированный backup и документированная restore-проверка.
- [ ] Media storage persistent (object storage предпочтителен для нескольких инстансов); локальный контейнерный диск не единственное хранилище.
- [ ] Email delivery проверена (verification/reset/notifications, если эти сценарии включены).
- [ ] CORS ограничен реальными origins.
- [ ] HTTPS, secure cookies/tokens, secret management и rate limits настроены.
- [ ] Seed/demo data отключены в production.
- [ ] Production secrets не имеют fallback/default значений.
- [ ] Health endpoint и graceful shutdown проверены.
- [ ] Логи не содержат секретов, паролей, токенов и избыточных PII.
- [ ] Есть мониторинг ошибок и алерты на недоступность backend/DB, если выбранный deployment stack поддерживает это.

## Gate 5 — Build / deploy / rollback

- [ ] Frontend production build проходит.
- [ ] Backend `mvn verify` проходит в CI.
- [ ] Frontend lint/test/build проходят в CI.
- [ ] Docker build backend проходит.
- [ ] Frontend deployment target однозначно определён (Cloudflare Pages build или Docker image); root compose не ссылается на отсутствующий Dockerfile.
- [ ] Path filters не пропускают shared config changes.
- [ ] Staging deploy и smoke tests выполнены.
- [ ] Rollback предыдущего frontend/backend release документирован.
- [ ] Database migration strategy backward-compatible или имеется безопасный rollback/recovery plan.
- [ ] Production deploy требует разрешения владельца.

## Минимальный E2E smoke suite

1. Anonymous visitor: homepage → search → listing → profile → request.
2. USER: register/login → create profile → submit for moderation.
3. ADMIN: login → review queue → approve/reject.
4. USER owner: see the moderation result and update own profile.
5. USER as learner and tutor: see sent and incoming requests separately.
6. ADMIN: block user; user session loses access as designed.
7. Public catalog: approved profile is visible, rejected/hidden/expired profile isn't.

## Go / No-Go

**GO:** все обязательные gates пройдены, P0/P1 findings закрыты, production configuration checked, rollback и restore rehearsed.  
**NO-GO:** есть непроверенная авторизация, публичная утечка приватных данных, неработающая заявка/модерация, неустойчивое хранение фото, известные default secrets или невозможность восстановить БД.

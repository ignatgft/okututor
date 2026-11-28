# Testing and Quality Rules

- Перед тестированием выясни существующие команды из `package.json`, `pom.xml`, test configs and CI.
- Backend: запускай релевантные unit/integration tests; при DB changes проверяй Flyway migrations на чистой PostgreSQL test database.
- Frontend: запускай относящиеся Vitest tests, ESLint и production build.
- Критические marketplace journeys покрывай E2E: search, public profile, request creation, resume submission, admin moderation, role/ownership.
- Добавляй негативные cases: unauthenticated, forbidden, other owner's ID, invalid payload, duplicate request, expired/hidden profile, rate limit.
- Не меняй tests так, чтобы они только повторяли реализацию или обходили assert.
- Не мокай внутренние ошибки backend в E2E, если проверяется реальная интеграция.
- Фиксируй команду, exit code и краткий результат; не заявляй о непроверенных командах.
- После исправлений повторяй соответствующий набор тестов.

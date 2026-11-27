---
trigger: model_decision
description: Spring Boot API, business logic, validation, persistence and compatibility
---

- Read actual `backend/pom.xml` and application profiles first.
- Keep controllers thin and reuse established service/repository/DTO conventions.
- Validate inputs and enforce owner/admin permissions server-side on every private operation.
- `TutorProfile`/`tutor_profiles` is canonical. No new Marketplace writes through `TutorApplication`.
- Use explicit response DTOs; never expose entity graphs or internal PII.
- Enforce pagination limits and validate filters/sort values.
- Preserve idempotency and status transitions; test concurrent mutation where relevant.
- Invalidate search/list caches after create/update/moderation/delete.
- Never put userId/email/phone/requestId/conversationId in metric labels.
- Existing Flyway migrations are immutable; schema changes use a new forward migration and integration test.
- Production must fail closed if secrets/origins/DB config are missing; no dev fallbacks.

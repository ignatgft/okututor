---
trigger: model_decision
description: PostgreSQL, JPA, Flyway and data lifecycle safety
---

- Inspect all entity relationships and migration history before schema changes.
- Never modify already-applied Flyway migrations; add a new migration only.
- Never drop tables/columns or user data as routine cleanup without approved migration and backup/rollback plan.
- Use DB constraints for uniqueness/referential integrity, especially concurrency-sensitive rules.
- Test full Flyway chain against disposable PostgreSQL.
- Confirm cascade/orphan removal and retention before changing relations.
- Align indexes with real filters/order and inspect query plans when performance matters.
- Test seeds only; never use sample production data.

---
trigger: model_decision
description: Automated tests, browser QA and release verification
---

- Every bug fix gets a regression test.
- Run backend unit/integration, frontend lint/unit/build and browser E2E as relevant.
- Use disposable test database and synthetic fixtures only.
- Browser scenarios require an actual browser run; source inspection is not browser verification.
- Record exact command, exit code, counts, skipped tests and blockers.
- Use PASSED/FAILED/BLOCKED/NOT RUN honestly; never invent green results.
- Verify Guest, USER owner, non-owner USER, ADMIN and SUPER_ADMIN boundaries.
- Verify error/empty/loading/retry and mobile viewports.

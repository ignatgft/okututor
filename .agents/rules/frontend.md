---
trigger: model_decision
description: Frontend React, routing, forms, state, accessibility and API integration
---

- Read current `frontend/package.json` and lockfile. Do not assume versions from stale documents.
- Use the existing API client, TanStack Query and Zustand responsibilities. Do not create a duplicate HTTP client or duplicate server state.
- Every control has a meaningful action, permission, loading/error/success state and test.
- Client validation improves UX; backend validation remains authoritative. Constraints must match.
- Filename selection is not upload success. Use actual upload response or remove the control.
- Keep URL query params and visible filter state synchronized.
- Use canonical paths from `PAGES_AND_ROUTES_MAP.md`.
- No invented public data/fallback ratings/photos/education/experience/achievements.
- Do not silence meaningful errors with empty catch blocks. Provide error/retry state.
- Preserve keyboard navigation, labels, dialog focus, mobile and reduced motion behavior.

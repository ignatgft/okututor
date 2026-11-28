# Production runbook — fill only with verified deployment details

## Deploy targets
- Frontend provider/project/base directory/build command:
- Backend provider/application/image/build context:
- Database provider/region/backup retention:
- Monitoring provider/application:

## Required environment variable names
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- JWT_SECRET
- APP_CORS_ORIGINS
- FRONTEND_URL
- MAIL_* / RESEND_API_KEY only if email is enabled
- R2_* only if R2 storage is enabled
- Google OAuth keys only if Google sign-in is enabled

## Deploy validation
1. Confirm branch and commit.
2. Confirm CI gates are green.
3. Confirm DB backup and migration compatibility plan.
4. Deploy backend (backward-compatible API first).
5. Verify health from trusted network.
6. Verify auth and public API smoke tests.
7. Deploy frontend.
8. Verify critical browser flow.
9. Verify Prometheus scrape and Grafana dashboard.

## Rollback
- Revert frontend to previous build/image.
- Revert backend to previous compatible image.
- Never automatically roll back a forward DB migration unless a tested rollback exists.
- Preserve audit trail and scrubbed logs.

## Incident handling
- Backend down: health, logs, DB connectivity, latest deployment.
- 5xx spike: investigate by route/error class without collecting PII; rollback if release regression.
- Data exposure: restrict access, revoke credentials/sessions, preserve evidence, notify owner.
- Failed migration: stop rollout, inspect schema history, follow approved recovery/backup plan.

Do not invent service URLs, passwords, Grafana links, backup retention or secret values.

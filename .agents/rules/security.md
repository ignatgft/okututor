---
trigger: model_decision
description: Security, authentication, authorization, privacy, secrets, upload and logging
---

- Verify IDOR for every profile/request/conversation/ticket/file endpoint.
- Frontend guards are UX only; backend authorization is mandatory.
- Public TutorProfile responses must not expose phone/email, moderation notes, auth fields or audit details.
- Only request participants and authorized admins may see request contact data; only conversation participants may access messages.
- Never log passwords, JWT/refresh tokens, cookies, verification/reset codes, phones or message bodies.
- Production must not use default passwords, placeholder OAuth keys, dev JWT secrets or demo seed.
- Validate file size, detected MIME and actual content; protect against traversal and decompression bombs.
- Rate-limit sensitive endpoints and test trusted forwarded IP handling.
- Protect Actuator/metrics behind internal access controls.
- Escape/sanitize untrusted user content before rendering.

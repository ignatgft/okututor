---
trigger: always_on
description: Product invariants and safety rules for OkuTutor agents
---

- OkuTutor is a free tutor marketplace for Kyrgyzstan, not a course/lesson LMS.
- `TutorProfile` is the canonical marketplace profile. Do not use legacy `TutorApplication` for new create/edit/moderation flows.
- New ordinary accounts use `USER`; profile ownership does not change account role. Legacy STUDENT/TUTOR/TEACHER are compatibility-only.
- Public pages display only facts actually returned by the canonical API. Never invent ratings, review counts, biography, education, experience, price, verified badges, achievements or people.
- Do not present TutorProfile rating/reviews until a legitimate marketplace review model exists.
- Free MVP has no subscriptions, payments, revenue, bookings, lessons or course KPI.
- Never delete legacy data/modules or Flyway history without dependency/migration proof.
- Preserve user changes; don't use destructive Git commands.
- A test is passed only when actually executed and result recorded.

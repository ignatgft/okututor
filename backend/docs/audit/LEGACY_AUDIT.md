# LEGACY_AUDIT

- `tutor` vs `tutors` (TutorApplication CSV vs TutorProfile normalized)
- `chat` vs `messaging` (marketplace vs EdTech)
- `course/enrollment/booking/lesson/schedule/availability` — старый LMS flow, 10 состояний enrollment, booking 8 статусов
- Frontend: `StudentRoutes/TutorRoutes`, `PgDashboard`, `PgSchedule` дубль, `Course` routes redirect to `/tutors`
- Не удалять без dependency map (booking/lesson используется в k6), cleanup только после Prod Audit

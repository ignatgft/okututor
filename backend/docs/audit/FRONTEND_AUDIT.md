# FRONTEND_AUDIT — 2026-09-16

- Marketplace `/tutors` + `/dashboard/*` работает, наложен на legacy `/student/* /tutor/* /course/*`
- 38 working, 18 partial, 6 broken, 22 legacy, 10 duplicated, 12 missing
- Broken: `PgBecomeTutor` mojibake, `PgTutorProfile` stub, `token.ts` sessionStorage (HttpOnly flag false)
- Partial: `PgAdminLegal` consents/audit tabs стабы, `CookieBanner` нет granular, `ReconsentBanner` нет POST
- Legacy: `StudentRoutes/TutorRoutes` redirect, `PgDashboard` old, `PgSchedule` дубль
- Missing: `/admin/audit`, `HttpOnly cookie`, `contact_tutor` GA event

Files: `AppRouter.tsx`, `PgBecomeTutor.tsx`, `token.ts`, `PgAdminLegal.tsx:162`, `CookieBanner.tsx`

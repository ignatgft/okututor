# OkuTutor — реестр страниц и маршрутов MVP

Реестр основан на `AppRouter.tsx`, `StudentRoutes.tsx`, `TutorRoutes.tsx`, `AdminRoutes.tsx` baseline. Проверить в браузере. Primary private area — unified `/dashboard/*` для `USER`.

## Public

| Route | Baseline page | Access | MVP decision |
|---|---|---|---|
| `/` | PgMain | Guest/User | Главная marketplace |
| `/login` | Login/AuthPage | Guest | Keep |
| `/register` | RegisterPage/AuthPage | Guest | Keep |
| `/verify-email` | PgVerifyEmail | Guest | Keep |
| `/forgot-password` | PgForgotPassword | Guest | Keep |
| `/reset-password` | PgResetPassword | Guest | Keep |
| `/oauth/callback`, `/oauth2/redirect` | PgOAuthCallback | Auth flow | Only when OAuth configured |
| `/tutors` | PgTutors | Guest/User | Canonical catalogue |
| `/tutor/:slug` | TutorProfileMarketplace | Guest/User | Canonical public tutor profile; align param name |
| `/become-tutor` | PgBecomeTutor | USER; guest auth gate | Canonical TutorProfile wizard |
| `/search` | PgSearch | Guest/User | Check overlap with `/tutors`; consolidate/redirect if duplicate |
| `/403` | PgForbidden | All | Keep |
| `*` | PgNotFound | All | Keep |

## Legacy public aliases

| Route | Baseline behavior | MVP policy |
|---|---|---|
| `/repetitors`, `/repetitors/:subject`, `/repetitors/:subject/:city` | Redirect `/tutors` | Keep if external/SEO compatibility needed |
| `/repetitor/:subject/:slug` | Redirect `/tutors` | Do not generate; all cards use `/tutor/:slug` |
| `/find-tutors` | Redirect `/tutors` | Keep alias if needed |
| `/course/:courseId`, `/course`, `/course/edit/:courseId` | Redirect marketplace/dashboard | Legacy only; no new links |

## Unified user dashboard

| Route | Purpose | Access | Main functionality |
|---|---|---|---|
| `/dashboard` | Overview | USER/ADMIN/SUPER_ADMIN as normal account | Profile status, requests, unread, real metrics |
| `/dashboard/resume` | Own TutorProfile | Same | Create/edit/status/public link |
| `/dashboard/requests` | Requests list | Same | Separate incoming/outgoing |
| `/dashboard/requests/:requestId` (baseline route param) | Request/conversation detail | Participant only | Verify whether the value is request ID or conversation ID; normalize only after tracing `PgMarketplaceChat` and backend contract |
| `/dashboard/profile` | Account data | Own account | View/edit own profile data |
| `/dashboard/settings` | Account/security | Own account | Password/session/email/delete only when API fully works |

## Admin

| Route | Page | Access | Scope |
|---|---|---|---|
| `/admin` | PgAdmin | ADMIN/SUPER_ADMIN | Marketplace operations overview |
| `/admin/users` | PgAdminUsers | ADMIN/SUPER_ADMIN | Search/block/unblock; role changes SUPER_ADMIN only |
| `/admin/tutors` | PgAdminTutors | ADMIN/SUPER_ADMIN | Canonical TutorProfile moderation, not legacy Application |
| `/admin/requests` | PgAdminRequests | ADMIN/SUPER_ADMIN | Abuse/support review of TutorRequest |
| `/admin/support` | PgAdminSupport | ADMIN/SUPER_ADMIN | Ticket queue |
| `/admin/support/tickets/:id` | PgAdminSupportTicket | ADMIN/SUPER_ADMIN | Ticket actions |
| `/admin/metrics` | PgAdminMetrics | ADMIN/SUPER_ADMIN | Only real marketplace/business metrics |
| `/admin/reviews` | PgAdminReviews | ADMIN/SUPER_ADMIN | Legacy Course reviews; hide from MVP nav unless separately justified |
| `/admin/reports` | PgAdminReports | ADMIN/SUPER_ADMIN | Keep only if full report workflow exists |
| `/admin/seo` | PgAdminSeo | ADMIN/SUPER_ADMIN | Optional if API affects public metadata/sitemap |
| `/admin/profile`, `/admin/settings` | PgProfile/PgSettings | Own admin account | Self-service only |

## Support

| Route | Purpose | Access |
|---|---|---|
| `/support` | Own tickets | Authenticated user/admin own-side |
| `/support/new` | Create ticket | Authenticated USER |
| `/support/tickets/:ticketId` | Ticket thread | Ticket owner or authorized admin |

## Legacy private routes to review

Baseline includes legacy student/tutor areas and EdTech routes, e.g. `/student/search`, `/student/tutors`, `/student/schedule`, `/student/lessons`, `/student/messages`, `/student/progress`, `/tutor/application`, `/tutor/stats`, `/tutor/students`, `/tutor/schedule`, `/tutor/lessons`, `/tutor/messages`, `/tutor/progress`, `/lesson/:bookingId`, `/bookings`, `/meeting`, `/meetings`, `/homework`, `/calendar`, `/schedule`, `/conversations`.

Убрать из основной MVP-навигации, если они не нужны; не удалять backend/data автоматически. Проверить imports, direct links, API, tests, DB references and history.

## Navigation checks
- Navbar links point to real page/section.
- Baseline scroll target `category` may differ from home section `subjects` — verify.
- BottomNav shows valid USER routes and real unread count.
- Admin nav contains only functional pages.
- All tutor cards use `/tutor/:slug`.
- Nested route direct refresh works through Nginx SPA fallback.
- Unknown route renders NotFound; no redirect loop.

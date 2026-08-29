# Okututor Frontend — Production Audit

**Date:** 2026-08-25  
**Codebase:** React 19 + Vite 6, JS, Zustand, i18n (ru/kg/en), livekit-client

---

## 1. Current Architecture

| Layer | Status |
|-------|--------|
| Routes | 40+ routes via React Router v6, lazy-loaded |
| Pages | 38 page files |
| Components | 50+ components across ui/, support/, admin/, HomeSection/, SearchComp/ |
| API | 10 domain api files + 5 client utilities |
| Store | Zustand (authStore only — no global app store) |
| Hooks | 7 hooks (useTheme, useCourseSearch, 5 support hooks) |
| Styles | 35 CSS files with tokens.css design system |
| i18n | 3 locales (en/ru/kg) with ~800 keys each |
| Tests | 19 tests (token, authStore, http, ProtectedRoute, Toast) |

---

## 2. Existing Routes

### Public
- `/` — Landing page
- `/search` — Course search
- `/course/:courseId` — Course detail
- `/tutor/:tutorId` — Tutor profile
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- `/oauth/callback`, `/oauth2/redirect`

### Student (ProtectedRoute roles=["STUDENT"])
- `/student/dashboard`, `/student/courses`, `/student/tutors`, `/student/requests`
- `/student/schedule`, `/student/lessons`, `/student/messages`, `/student/notifications`
- `/student/progress`, `/student/profile`, `/student/settings`

### Tutor (ProtectedRoute roles=["TUTOR", "ADMIN"])
- `/tutor/dashboard`, `/tutor/courses`, `/tutor/courses/new`, `/tutor/courses/edit/:courseId`
- `/tutor/students`, `/tutor/schedule`, `/tutor/lessons`, `/tutor/messages`
- `/tutor/notifications`, `/tutor/profile`, `/tutor/settings`
- `/tutor/application`, `/tutor/progress`

### Shared Authenticated
- `/lesson/:bookingId`, `/become-tutor`
- `/support`, `/support/new`, `/support/tickets/:ticketId`

### Admin (ProtectedRoute roles=["ADMIN"])
- `/admin`, `/admin/users`, `/admin/tutors`, `/admin/courses`
- `/admin/reviews`, `/admin/reports`
- `/admin/support`, `/admin/support/tickets/:id`
- `/admin/profile`, `/admin/settings`

### Legacy Redirects
- `/dashboard`, `/profile`, `/schedule`, `/messages`, `/progress`, `/settings` → role-based redirect

---

## 3. Existing User Flows

### Student Flow
Registration → Email verification → Login → Dashboard → Search → Course → Tutor → Enrollment/Booking → Lesson → Video → Messages → Support

### Tutor Flow
Registration → Email verification → Become Tutor → Application → Pending moderation → Approved → Dashboard → Create course → Draft → Submit moderation → Published → Students → Lessons → Messages → Support

### Admin Flow
Login → Dashboard → Users/Tutors/Courses/Reports moderation → Support conversations

### Support Flow (CURRENT — separate)
User creates ticket at `/support/new` → List at `/support` → Chat at `/support/tickets/:id`

---

## 4. Existing API Contracts

| Domain | File | Endpoints |
|--------|------|-----------|
| Auth | auth.api.js | login, register, logout, me, refresh, forgot, reset, verify-email, resend, change-email |
| Users | users.api.js | me, byId, update, avatar, tutors |
| Courses | courses.api.js | list, popular, byId, create, update, delete, byTeacher |
| Tutors | tutors.api.js | applications, myApplication, byId, availability |
| Bookings | (inline in pages) | create, byId, confirm, reject, cancel, complete, my, teacher |
| Lessons | lessons.api.js | list, byId, create, cancel, complete, start |
| Messages | messages.api.js | conversations, conversation(id), send |
| Notifications | messages.api.js | list, unreadCount, markRead, markAllRead |
| Support | support.api.js | createTicket, getTickets, getTicket, getMessages, sendMessage, markRead, close, reopen |
| Admin Support | support.api.js | getTickets, getTicket, assign, take, updateStatus, updatePriority, getAgents |
| Admin | admin.api.js | users, block/unblock, role, verify, stats, tutors, approve/reject tutor/course, reviews, reports |
| Reviews | reviews.api.js | list, create, createForBooking |

---

## 5. Existing Broken Flows

1. **Support as separate section** — creates UX fragmentation; should be inside Messages
2. **Role checks are hardcoded** — 16+ locations use raw strings ("ADMIN", "TUTOR") instead of ROLES constants (only 2 locations use them)
3. **No SUPER_ADMIN role** — enums.js only has STUDENT/TUTOR/ADMIN
4. **No permissions layer** — all access control is role-based with no granular permissions
5. **PgProgress.jsx** — hardcoded role check instead of using isTutorLike()
6. **Navbar height** — 78px desktop, 60px mobile vs token --header-height 64px
7. **Two hardcoded hex colors** in Sidebar.css (#e53e3e, #3563e9)
8. **Notifications page** — static display, no real backend integration
9. **Settings** — hardcoded "Email notifications: Enabled"
10. **Messages polling** — 5s interval, no WebSocket readiness

---

## 6. Missing Flows

1. **SUPER_ADMIN flow** — admin management, audit, system settings
2. **Permission-based UI hiding** — currently only role-based
3. **Support inside Messages** — ticket as conversation type
4. **Unified conversation model** (DIRECT / SUPPORT / SYSTEM)
5. **Mobile drawer** — hamburger opens dropdown, not proper drawer
6. **Safe area handling** for iPhone/Android
7. **API error abstraction** — ApiError class with fieldErrors, retryable, etc.
8. **URL-synced search** — search state not persisted in URL params
9. **Proper pagination** — most lists load all data
10. **Real-time abstraction** — WebSocket extension point for messages
11. **Analytics events** — no tracking infrastructure
12. **SEO metadata** — no dynamic title/description
13. **.env.example** — no documented env vars

---

## 7. Mobile Problems

1. **Hamburger menu** — opens a fixed dropdown under navbar, not a proper drawer
2. **No safe-area-inset** applied to BottomNav
3. **DashboardLayout** only adjusts padding at 768px, no intermediate breakpoints
4. **Admin tables** — overflow-x: auto is acceptable but card layout would be better
5. **Support ticket list** — no mobile-optimized card layout
6. **Message input** — keyboard can cover composer
7. **Touch targets** — some buttons below 44px minimum
8. **Navbar height** mismatch with token system
9. **No tablet breakpoint** — jumps from mobile to desktop at 768px
10. **CardCourse** may overflow on narrow screens

---

## 8. Security Problems

1. **Frontend role checks only** — no backend enforcement assumed
2. **localStorage tokens** — not httpOnly cookies (documented as future migration)
3. **No CSRF protection** — relying on Bearer token
4. **No input sanitization** on message bodies (XSS risk if backend doesn't sanitize)
6. **Support ticket access** — frontend doesn't verify ownership before showing

---

## 9. UX Problems

1. **Support fragmentation** — separate /support section instead of being in Messages
2. **No unified communication center** — Messages and Support are disconnected
3. **Landing page** — desktop navbar doesn't work well on mobile
4. **Dashboard mobile** — relies on BottomNav but no "More" menu for secondary items
5. **Course creation** — multi-step wizard but no draft auto-save
6. **Booking flow** — no clear progress indicator
7. **Empty states** — inconsistent (some pages have them, some don't)
8. **Error states** — some pages show raw error text
9. **Notifications** — click behavior undefined
10. **Search state lost** on browser back/forward

---

## 10. Production Blockers

1. ❌ No SUPER_ADMIN role
2. ❌ No permissions layer
3. ❌ Support not integrated into Messages
4. ❌ Mobile navigation needs overhaul
5. ❌ No API error abstraction
6. ❌ Hardcoded role strings throughout codebase
7. ❌ No .env.example
8. ❌ No PRODUCTION_READINESS.md
9. ❌ No docs/API_CONTRACT.md
10. ❌ Messages polling instead of WebSocket readiness

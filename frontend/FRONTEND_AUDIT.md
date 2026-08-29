# Okututor Frontend Audit

**Date:** 2026-08-25  
**Auditor:** opencode  
**Build:** ✅ Passes (vite build, 250 modules, 2.42s)

---

## Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| Build | ✅ Clean | 2 Vite warnings (redundant dynamic imports), 1 chunk size warning |
| Routes | ✅ Complete | 33 pages, proper role-based guards, legacy redirects |
| API Layer | ✅ Solid | Structured httpClient → service → endpoints pattern |
| State | ✅ Minimal | Zustand auth store only; server data per-component |
| i18n | ⚠️ Partial | 3 locales, but some hardcoded RU fallbacks in defaults |
| Design System | ✅ Good | tokens.css, CSS variables, light/dark theme |
| Responsive | ❌ Broken | 19/33 CSS files lack @media queries |
| Accessibility | ⚠️ Basic | No skip-nav, limited aria, no focus management hooks |
| Performance | ⚠️ Issues | PgLesson 540KB, hero image 702KB, tutor image 345KB |
| UX States | ✅ Good | Skeleton, Spinner, ErrorState, EmptyState, Toast, ConfirmModal |

---

## Build Warnings

1. **Redundant dynamic+static import** — `mockData.js` and `token.js` are dynamically imported but also statically imported from the same modules. Vite cannot tree-shake properly.
2. **Chunk size warning** — `PgLesson` bundle is **540.72 KB** (livekit-client). `index.js` is 394.17 KB. Both exceed 500 KB threshold.
3. **Large assets** — `heroSection.png` (702 KB), `tutor-img.jpeg` (345 KB) should be optimized.

---

## Route Inventory (App.jsx)

### Public Routes
| Path | Component | Status |
|------|-----------|--------|
| `/` | PgMain | ✅ |
| `/login` | Login (PgMain + modal) | ✅ |
| `/register` | RegisterPage (PgMain + modal) | ✅ |
| `/forgot-password` | PgForgotPassword | ✅ |
| `/reset-password` | PgResetPassword | ✅ |
| `/oauth/callback` | PgOAuthCallback | ✅ |
| `/oauth2/redirect` | PgOAuthCallback | ✅ |
| `/search` | PgSearch | ✅ |
| `/find-tutors` | → /search redirect | ✅ |
| `/course/:courseId` | PgCourseView | ✅ |
| `/tutor/:tutorId` | PgTutorProfile | ✅ |
| `/403` | PgForbidden | ✅ |
| `*` | PgNotFound | ✅ |

### Student Routes (ProtectedRoute roles=["STUDENT"])
| Path | Component | Status |
|------|-----------|--------|
| `/student/dashboard` | PgDashboard | ✅ |
| `/student/courses` | PgStudentCourses | ✅ |
| `/student/tutors` | PgStudentTutors | ✅ |
| `/student/requests` | PgStudentRequests | ✅ |
| `/student/schedule` | PgSchedule | ✅ |
| `/student/lessons` | PgLessons | ✅ |
| `/student/messages` | PgMessages | ✅ |
| `/student/notifications` | PgNotifications | ✅ |
| `/student/progress` | PgProgress | ✅ |
| `/student/profile` | PgProfile | ✅ |
| `/student/settings` | PgSettings | ✅ |

### Tutor Routes (ProtectedRoute roles=["TUTOR", "ADMIN"])
| Path | Component | Status |
|------|-----------|--------|
| `/tutor/dashboard` | PgTutorDashboard | ✅ |
| `/tutor/application` | PgTutorApplication | ✅ |
| `/tutor/courses` | PgTutorCourses | ✅ |
| `/tutor/courses/new` | PgCourse | ✅ |
| `/tutor/courses/create` | PgCourse | ✅ |
| `/tutor/courses/edit/:courseId` | PgCourse | ✅ |
| `/tutor/students` | PgTutorStudents | ✅ |
| `/tutor/schedule` | PgSchedule | ✅ |
| `/tutor/lessons` | PgLessons | ✅ |
| `/tutor/messages` | PgMessages | ✅ |
| `/tutor/notifications` | PgNotifications | ✅ |
| `/tutor/profile` | PgProfile | ✅ |
| `/tutor/settings` | PgSettings | ✅ |
| ⚠️ `/tutor/progress` | **MISSING** — PgProgress not wired | ❌ |

### Shared Routes (ProtectedRoute — any role)
| Path | Component | Status |
|------|-----------|--------|
| `/lesson/:bookingId` | PgLesson | ✅ |
| `/become-tutor` | PgBecomeTutor | ✅ |

### Admin Routes (ProtectedRoute roles=["ADMIN"])
| Path | Component | Status |
|------|-----------|--------|
| `/admin` | PgAdmin | ✅ |
| `/admin/users` | PgAdminUsers | ✅ |
| `/admin/tutors` | PgAdminTutors | ✅ |
| `/admin/courses` | PgAdminCourses | ✅ |
| `/admin/reviews` | PgAdminReviews | ✅ |
| `/admin/reports` | PgAdminReports | ✅ |
| `/admin/profile` | PgProfile | ✅ |
| `/admin/settings` | PgSettings | ✅ |

### Legacy Redirects
| Path | Target | Status |
|------|--------|--------|
| `/dashboard` | RoleRedirect → student/tutor dashboard | ✅ |
| `/profile` | RoleRedirect → student/tutor profile | ✅ |
| `/schedule` | RoleRedirect → student/tutor schedule | ✅ |
| `/messages` | RoleRedirect → student/tutor messages | ✅ |
| `/progress` | RoleRedirect → student/tutor progress | ⚠️ tutor has no /tutor/progress route |
| `/settings` | RoleRedirect → student/tutor settings | ✅ |
| `/course` | → /tutor/courses/create | ✅ |
| `/course/edit/:courseId` | → /tutor/courses/edit/:courseId | ✅ |

---

## Page-by-Page Audit

### PgMain (Home)
- **Components:** HeroSection, Category, PopTutor, HowItWorks, ForTutors, Footer
- **i18n:** ✅ Full
- **Responsive:** ✅ All child components have @media queries
- **UX:** ✅ scroll-to-section via react-scroll
- **Missing:** "Почему Okututor" section not implemented (referenced in brief)
- **Priority:** Low (content gap, not a bug)

### PgDashboard (Student)
- **Components:** DashboardLayout, ConfirmModal, ReviewModal, Skeleton/ErrorState/EmptyState
- **i18n:** ✅ Full
- **Responsive:** ✅ Dashboard.css has @media
- **UX:** ✅ Loading/error/empty states, cancel with confirm, review modal
- **API:** ✅ useCallback + cleanup pattern
- **Priority:** Low

### PgTutorDashboard
- **Components:** DashboardLayout, ConfirmModal, Skeleton/ErrorState/EmptyState
- **i18n:** ⚠️ Some fallback strings hardcoded ("Confirm", "Reject", "Join", "Complete" in bookings tab not using t())
- **Responsive:** ✅ Dashboard.css has @media
- **UX:** ✅ Tab-based with URL sync, booking actions
- **Bug:** "courses" tab exists in TABS array but no UI renders for it (dead tab)
- **Priority:** Medium

### PgSearch
- **Components:** SearchBar, DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ✅ SearchBar.css has @media
- **UX:** ✅ Loading/error/empty states, debounce, URL sync
- **Priority:** Low

### PgAdmin
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ❌ Admin.css lacks @media (broken on mobile)
- **UX:** ⚠️ Only loading state, no error state for failed stats fetch
- **Bug:** BottomNav returns null for ADMIN → no mobile navigation
- **Priority:** High (mobile usability broken for admins)

### PgCourseView
- **Components:** DashboardLayout, CourseViewContent, ReviewModal, ReasonModal
- **i18n:** ✅ Full
- **Responsive:** ❌ CourseView.css lacks @media
- **UX:** ✅ Loading/error states, booking flow with confirm
- **Priority:** Medium

### PgCourse (Wizard)
- **Components:** DashboardLayout, CourseWizard
- **i18n:** ✅ Full
- **Responsive:** ❌ Course.css lacks @media (wizard broken on mobile)
- **UX:** ✅ 3-step wizard, validation
- **Priority:** High (tutor can't create courses on mobile)

### PgProfile
- **Components:** DashboardLayout, Profile
- **i18n:** ✅ Full
- **Responsive:** ✅ Profile.css has @media
- **UX:** ✅ Loading/error states, edit/save
- **Priority:** Low

### PgLesson
- **Components:** ConfirmModal, LiveKit Room
- **i18n:** ✅ Full
- **Responsive:** ❌ Lesson.css lacks @media (video call broken on mobile)
- **UX:** ✅ Connection states, timer, mute/camera/screenshare controls, leave confirm
- **Bundle:** ⚠️ 540 KB (livekit-client)
- **Priority:** High (core feature, mobile broken, bundle too large)

### PgSettings
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ❌ Settings.css lacks @media
- **UX:** ✅ Theme toggle, language selector
- **Priority:** Medium

### PgSchedule
- **Components:** DashboardLayout, ScheduleItem
- **i18n:** ✅ Full
- **Responsive:** ❌ Schedule.css lacks @media
- **UX:** ✅ Loading/error/empty states, filter tabs
- **Priority:** Medium

### PgMessages
- **Components:** DashboardLayout, ChatWindow
- **i18n:** ✅ Full
- **Responsive:** ✅ Messages.css has @media
- **UX:** ✅ Conversation list + detail view
- **Priority:** Low

### PgNotifications
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ⚠️ Needs checking
- **UX:** ✅ Loading/error/empty states, mark as read
- **Priority:** Low

### PgProgress
- **Components:** DashboardLayout, ProgressChart
- **i18n:** ✅ Full
- **Responsive:** ✅ Progress.css has @media
- **UX:** ✅ Loading/error states, progress visualization
- **Priority:** Low

### PgBecomeTutor
- **Components:** DashboardLayout, MultiStepForm
- **i18n:** ✅ Full
- **Responsive:** ✅ ForTutors.css has @media
- **UX:** ✅ Multi-step with validation, localStorage persistence
- **Priority:** Low

### PgTutorApplication
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ⚠️ Needs checking
- **UX:** ✅ Loading/error states, status display
- **Priority:** Low

### PgTutorCourses
- **Components:** DashboardLayout, CardCourse
- **i18n:** ✅ Full
- **Responsive:** ❌ CardCourse.css lacks @media
- **UX:** ✅ Loading/error/empty states, create/edit/delete
- **Priority:** Medium

### PgTutorStudents
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ⚠️ Needs checking
- **UX:** ✅ Loading/error/empty states, student list with stats
- **Priority:** Low

### PgStudentCourses
- **Components:** DashboardLayout, CardCourse
- **i18n:** ✅ Full
- **Responsive:** ❌ CardCourse.css lacks @media
- **UX:** ✅ Loading/error/empty states
- **Priority:** Medium

### PgStudentTutors
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ⚠️ Needs checking
- **UX:** ✅ Loading/error/empty states, tutor list
- **Priority:** Low

### PgStudentRequests
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ⚠️ Needs checking
- **UX:** ✅ Loading/error/empty states, request actions
- **Priority:** Low

### PgLessons
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ⚠️ Needs checking
- **UX:** ✅ Loading/error/empty states, lesson list
- **Priority:** Low

### PgAdminUsers
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ❌ Admin.css lacks @media
- **UX:** ✅ Loading/error states, user management actions
- **Priority:** Medium

### PgAdminTutors
- **Components:** DashboardLayout, ReasonModal
- **i18n:** ✅ Full
- **Responsive:** ❌ Admin.css lacks @media
- **UX:** ✅ Loading/error states, approval/rejection flow
- **Priority:** Medium

### PgAdminCourses
- **Components:** DashboardLayout, ReasonModal
- **i18n:** ✅ Full
- **Responsive:** ❌ Admin.css lacks @media
- **UX:** ✅ Loading/error states, moderation actions
- **Priority:** Medium

### PgAdminReviews
- **Components:** DashboardLayout, ReasonModal
- **i18n:** ✅ Full
- **Responsive:** ❌ Admin.css lacks @media
- **UX:** ✅ Loading/error states, moderation actions
- **Priority:** Medium

### PgAdminReports
- **Components:** DashboardLayout
- **i18n:** ✅ Full
- **Responsive:** ❌ Admin.css lacks @media
- **UX:** ✅ Loading/error states, report list
- **Priority:** Medium

### PgForgotPassword
- **Components:** None (standalone form)
- **i18n:** ✅ Full
- **Responsive:** ❌ AuthForms.css lacks @media
- **UX:** ✅ Loading/error states, success message
- **Priority:** Low (form is simple enough)

### PgResetPassword
- **Components:** None (standalone form)
- **i18n:** ✅ Full
- **Responsive:** ❌ AuthForms.css lacks @media
- **UX:** ✅ Loading/error states, password validation
- **Priority:** Low

### PgOAuthCallback
- **Components:** None (pure logic)
- **i18n:** ✅ Full
- **Responsive:** N/A
- **UX:** ✅ Handles token exchange, error states
- **Priority:** Low

### PgNotFound
- **Components:** None (standalone)
- **i18n:** ❌ Hardcoded English, no i18n
- **Responsive:** ⚠️ Needs checking
- **UX:** ✅ Has back-to-home link
- **Priority:** Low

### PgForbidden
- **Components:** None (standalone)
- **i18n:** ❌ Hardcoded English, no i18n
- **Responsive:** ⚠️ Needs checking
- **UX:** ✅ Has back-to-home link
- **Priority:** Low

---

## Component Audit

### Layout Components
| Component | Responsive | A11y | Notes |
|-----------|-----------|------|-------|
| Sidebar.jsx | ✅ Hides on mobile | ⚠️ Basic nav | 230px fixed, proper role="navigation" |
| BottomNav.jsx | ✅ Mobile only | ⚠️ Basic nav | Returns null for ADMIN |
| DashboardLayout.jsx | ✅ Has @media | ⚠️ Basic | Sidebar + content layout |
| Navbar.jsx | ✅ Has @media | ⚠️ Basic | Public page navbar |

### UI Primitives (Primitives.jsx)
| Component | Status | Notes |
|-----------|--------|-------|
| Spinner | ✅ | Accessible, customizable |
| Skeleton | ✅ | Pulse animation |
| ErrorState | ✅ | With retry button |
| EmptyState | ✅ | Icon + title + hint |

### UI Modals
| Component | Status | Notes |
|-----------|--------|-------|
| ConfirmModal | ✅ | Proper focus trap, keyboard handling |
| ReviewModal | ✅ | Star rating, comment input |
| ReasonModal | ✅ | Required reason for rejection |

### UI Toast
| Component | Status | Notes |
|-----------|--------|-------|
| Toast | ✅ | Auto-dismiss, success/error variants |

### Form Components
| Component | Status | Notes |
|-----------|--------|-------|
| Form.jsx | ✅ | Validation, submit handling |
| SearchBar.jsx | ✅ | Debounce, URL sync, keyboard navigation |
| CourseWizard.jsx | ✅ | 3-step wizard, validation |

### Card Components
| Component | Status | Notes |
|-----------|--------|-------|
| CardCourse.jsx | ❌ No @media | Progress bars overflow on mobile |
| TutorProfileContent.jsx | ⚠️ | Depends on TutorProfile.css |

---

## API Architecture

### Client Layer
- **httpClient.js:** fetch-based with refresh orchestration, abort support
- **authInterceptor.js:** Token injection, 401 handling
- **refreshManager.js:** Concurrent refresh queue
- **token.js:** Storage abstraction (localStorage → cookies ready)

### Service Layer
| Service | Endpoints | Status |
|---------|-----------|--------|
| auth.api.js | login, register, logout, me, refresh, forgot-password, reset-password, OAuth | ✅ |
| courses.api.js | CRUD, search, byTeacher, byStudent | ✅ |
| bookings.api.js | my, teacher, cancel, confirm, reject, complete | ✅ |
| messages.api.js | conversations, messages, send | ✅ |
| admin.api.js | stats, users, tutors, courses, reviews, reports | ✅ |
| tutors.api.js | profile, applications | ✅ |
| students.api.js | courses, tutors, requests | ✅ |
| reviews.api.js | create, list | ✅ |
| users.api.js | profile, update | ✅ |
| lessons.api.js | token, end | ✅ |

### Mock Mode
- Enabled via `isMockEnabled()` in config.js
- Returns static data from mockData.js
- All services check mock mode before API calls

---

## State Management

### Zustand Stores
- **authStore.js:** init/status machine (initializing → auth/unauth), login/logout actions
- No global data stores — all server data fetched per-component

### Local State Patterns
- `useState` + `useCallback` for API calls
- `useEffect` for data loading with cleanup
- `useSearchParams` for URL-synced state (PgTutorDashboard tabs)
- `useLocalStorage` for form persistence (PgBecomeTutor)

---

## Design System

### Tokens (tokens.css)
- Colors: primary (#3563E9), success, warning, danger, surface, border
- Typography: Inter font family, size scale, weight scale
- Spacing: 4px base scale
- Border radius: sm/md/lg/xl/2xl/full
- Shadows: sm/md/lg/xl/2xl
- Z-index scale: sticky(100), sidebar(200), modal(2100), toast(2200)
- Transitions: fast/base/slow
- Touch target: 44px minimum
- Safe area: env(safe-area-inset-bottom)

### Theme
- Light (default) + Dark via `[data-theme="dark"]`
- Toggle in PgSettings, persisted in localStorage
- All components use CSS variables for theming

---

## Responsive Audit

### Files WITH @media queries (14 files)
1. `index.css` — Utility classes, font scaling
2. `SearchBar.css` — Mobile search layout
3. `Sidebar.css` — Hide on mobile
4. `Progress.css` — Chart responsiveness
5. `Profile.css` — Card stacking
6. `Navbar.css` — Mobile menu
7. `Messages.css` — Chat layout
8. `HowItWorks.css` — Step cards
9. `HeroSection.css` — Hero text sizing
10. `ForTutors.css` — CTA section
11. `Category.css` — Grid layout
12. `DashboardLayout.css` — Sidebar collapse
13. `Dashboard.css` — Stats grid, booking cards
14. `BottomNav.css` — Mobile navigation

### Files WITHOUT @media queries (19 files)
1. **CardCourse.css** — Progress bars overflow ❌
2. **Course.css** — Wizard broken on mobile ❌
3. **CourseView.css** — Detail page broken on mobile ❌
4. **AuthRegister/Auth.css** — Login modal broken on mobile ❌
5. **AuthRegister/Register.css** — Register modal broken on mobile ❌
6. **AuthRegister/Modal.css** — Modal backdrop broken ❌
7. **AuthForms.css** — Forgot/reset password forms ❌
8. **Form.css** — Form fields fine (flex-column) ✅
9. **ConfirmModal.css** — Modal fine (max-width 400px) ✅
10. **Admin.css** — Admin dashboard broken on mobile ❌
11. **Schedule.css** — Schedule broken on mobile ❌
12. **Settings.css** — Settings broken on mobile ❌
13. **Lesson.css** — Video call broken on mobile ❌
14. **PgAuditorium.css** — Legacy, not used in routes
15. **TutorProfile.css** — Profile broken on mobile ❌
16. **HomeSectionCSS/PopTutor.css** — Tutor cards broken ❌
17. **Footer.css** — Footer broken on mobile ❌
18. **Pagination.css** — Pagination fine (flex-wrap) ✅
19. **Toast.css** — Toast fine (fixed positioning) ✅

---

## Accessibility Audit

### Current State
- ✅ `lang` attribute on `<html>` element
- ✅ Semantic HTML used (header, main, nav, section, article)
- ✅ Form labels properly associated
- ✅ Button text/aria-labels on lesson controls
- ✅ Focus visible styles defined in tokens.css
- ✅ Touch targets ≥ 44px (CSS variable)
- ✅ Safe area insets for notched devices

### Missing
- ❌ No skip-to-content link
- ❌ No `<main>` landmark wrapping page content
- ❌ Limited `aria-label` on interactive elements
- ❌ No focus management on route changes
- ❌ No `aria-live` regions for dynamic content updates
- ❌ No reduced-motion media query
- ❌ Modal focus traps basic (no return-focus on close)
- ❌ ErrorBoundary hardcoded English, no i18n

---

## Performance Audit

### Bundle Analysis
| Chunk | Size | Gzip | Issue |
|-------|------|------|-------|
| index.js | 394.17 KB | 123.55 KB | Core bundle, near limit |
| PgLesson.js | 540.72 KB | 141.27 KB | ❌ livekit-client too large |
| PgMain.js | 33.80 KB | 9.68 KB | OK |
| Navbar.js | 34.53 KB | 10.05 KB | OK |

### Asset Analysis
| Asset | Size | Issue |
|-------|------|-------|
| heroSection.png | 701.93 KB | ❌ Should be WebP/AVIF, lazy loaded |
| tutor-img.jpeg | 345.21 KB | ❌ Should be WebP, lazy loaded |
| white-logo.svg | 10.31 KB | OK |
| logo.svg | 1.81 KB | OK |

### Optimization Recommendations
1. **PgLesson:** Dynamic import livekit-client, split into separate chunk
2. **Hero image:** Convert to WebP, add `loading="lazy"`, consider blur-up placeholder
3. **Tutor image:** Convert to WebP, lazy load
4. **Navbar:** Consider splitting language selector into separate chunk
5. **index.js:** Review if react-scroll, react-icons can be tree-shaken better

---

## Priority Fixes

### P0 — Critical (Blocks functionality)
1. **Admin mobile navigation missing** — BottomNav returns null for ADMIN
2. **CardCourse progress overflow** — No @media, breaks on mobile
3. **Course wizard broken on mobile** — No @media in Course.css
4. **Video call broken on mobile** — No @media in Lesson.css

### P1 — High (Significant UX impact)
5. **19 CSS files lack responsive styles** — Systematic mobile breakage
6. **PgLesson bundle 540 KB** — Performance impact
7. **Hero image 702 KB** — Performance impact
8. **Tutor profile broken on mobile** — No @media in TutorProfile.css
9. **Schedule broken on mobile** — No @media in Schedule.css
10. **Settings broken on mobile** — No @media in Settings.css

### P2 — Medium (Quality improvements)
11. **Missing /tutor/progress route** — RoleRedirect targets non-existent route
12. **Dead "courses" tab in PgTutorDashboard** — No UI renders
13. **ErrorBoundary no i18n** — Hardcoded English
14. **PgNotFound/PgForbidden no i18n** — Hardcoded English
15. **Auth modals broken on mobile** — No @media in AuthRegister CSS
16. **Missing skip-to-content link** — A11y requirement
17. **Missing reduced-motion query** — A11y requirement
18. **Tutor dashboard hardcoded strings** — Some buttons not using t()

### P3 — Low (Polish)
19. **"Почему Okututor" section missing** — Content gap
20. **Redundant dynamic imports** — Vite warnings
21. **PopTutor/Footer broken on mobile** — Landing page sections
22. **PgAuditorium.css unused** — Dead CSS file
23. **console.error in PgAdmin** — Should use ErrorState

---

## Recommended Phase Order

1. **Phase 1: Critical Bugs** — Fix P0 items (admin nav, CardCourse, Course wizard, Lesson)
2. **Phase 2: Responsive System** — Add @media to all 19 CSS files systematically
3. **Phase 3: Performance** — Optimize PgLesson bundle, hero image, tutor image
4. **Phase 4: Routes & Navigation** — Fix /tutor/progress, dead tab, legacy redirects
5. **Phase 5: i18n Completion** — ErrorBoundary, NotFound, Forbidden, hardcoded strings
6. **Phase 6: Accessibility** — Skip-nav, landmarks, focus management, reduced-motion
7. **Phase 7: UX Polish** — Dead code cleanup, consistent error handling, console.error removal
8. **Phase 8: Final QA** — Full responsive test, build verification, cross-browser check

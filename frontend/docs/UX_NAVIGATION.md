# Okututor Frontend — UX & Navigation Documentation

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Roles](#roles)
3. [Layout Architecture](#layout-architecture)
4. [Responsive Breakpoints](#responsive-breakpoints)
5. [Navigation Config](#navigation-config)
6. [Student Navigation](#student-navigation)
7. [Tutor Navigation](#tutor-navigation)
8. [Admin Navigation](#admin-navigation)
9. [Sidebar](#sidebar)
10. [BottomNav](#bottomnav)
11. [Shared Pages](#shared-pages)
12. [Key Patterns & Hooks](#key-patterns--hooks)
13. [Route Reference](#route-reference)
14. [File Reference](#file-reference)

---

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI framework |
| Vite | 6 | Build tool & dev server |
| React Router | 7 | Client-side routing |
| Zustand | — | State management |
| i18next | — | Internationalization |
| react-icons | — | Icon library (FontAwesome subset) |

---

## Roles

Four roles defined in `src/constants/roles.js`:

| Constant | Value | Helper Function | Notes |
|----------|-------|-----------------|-------|
| `ROLES.STUDENT` | `"STUDENT"` | `isStudent(role)` | Standard learner account |
| `ROLES.TUTOR` | `"TUTOR"` | `isTutor(role)` | Tutor with course creation |
| `ROLES.ADMIN` | `"ADMIN"` | `isAdmin(role)` | Admin includes SUPER_ADMIN |
| `ROLES.SUPER_ADMIN` | `"SUPER_ADMIN"` | `isSuperAdmin(role)` | Elevated admin |

Additional helpers:
- `isAdmin(role)` — returns `true` for both `ADMIN` and `SUPER_ADMIN`
- `isTutorLike(role)` — returns `true` for `TUTOR`, `ADMIN`, and `SUPER_ADMIN`
- `ADMIN_ROLES` — array `[ADMIN, SUPER_ADMIN]`

Route guards use `ProtectedRoute` which accepts a `roles` prop array. When omitted, any authenticated user can access.

---

## Layout Architecture

Three role-based layouts wrap a shared `DashboardLayout` component:

```
StudentLayout ─┐
               ├──▶ DashboardLayout ──▶ Sidebar + Outlet
TutorLayout  ──┤
               │
AdminLayout  ──┘
```

Each role layout (`src/layouts/`) resolves the current page title via `getPageTitle(roleKey, pathname)` and passes it to `DashboardLayout`.

`DashboardLayout` (`src/components/DashboardLayout.jsx`) provides:
- Responsive sidebar (fixed or drawer)
- Mobile header with hamburger + dynamic title
- Content area (`<Outlet />` for nested routes)
- `PageTitleProvider` context for child components

Nested routes mean only the `<Outlet />` re-renders on navigation — the sidebar persists.

---

## Responsive Breakpoints

| Breakpoint | Width Range | Behavior |
|-----------|-------------|----------|
| Mobile | < 768px | Drawer sidebar (overlay) + BottomNav + mobile header with hamburger |
| Tablet | 768px – 1199px | Collapsed icon-only sidebar (fixed, 72px wide) |
| Desktop | ≥ 1200px | Full sidebar (fixed, 260px wide) + content |

Breakpoints are detected in `DashboardLayout` via `window.innerWidth`:
- `isMobile`: `w <= 767`
- `isTablet`: `w >= 768 && w <= 1199`

### Mobile Layout

```
┌─────────────────────────────┐
│ ☰  Page Title               │  ← mobile header
├─────────────────────────────┤
│                             │
│        Content Area         │
│                             │
├─────────────────────────────┤
│ 🏠  📚  💬  🔧  👤         │  ← BottomNav
└─────────────────────────────┘
```

### Tablet Layout

```
┌────────┬────────────────────┐
│ 🏠     │                    │
│ 📚     │                    │
│ 📅     │   Content Area     │
│ 📊     │                    │
│ 💬     │                    │
│────────│                    │
│ 🔔     │                    │
│ ⚙️     │                    │
│ 👤     │                    │
└────────┴────────────────────┘
  72px
```

### Desktop Layout

```
┌──────────────────┬──────────────────────────┐
│ 🏠 Dashboard     │                          │
│ 📚 Find Tutor    │                          │
│ 📅 Schedule      │     Content Area         │
│ 📊 Progress      │                          │
│ 💬 Messages      │                          │
│ 🔧 Support       │                          │
│──────────────────│                          │
│ 🔔 Notifications │                          │
│ ⚙️ Settings      │                          │
│──────────────────│                          │
│ 👤 Profile       │                          │
└──────────────────┴──────────────────────────┘
       260px
```

---

## Navigation Config

All navigation data lives in `src/config/navigation.js`:

- `SIDEBAR_ITEMS` — object keyed by role (`student`, `tutor`, `admin`), each an array of nav items
- `BOTTOMNAV_ITEMS` — same structure for mobile bottom bar
- `PAGE_TITLES` — maps `(roleKey, pathname)` → i18n key for mobile header
- `getPageTitle(roleKey, pathname)` — returns i18n key or empty string
- `getDashboardPath(role)` — returns default dashboard URL for a role
- `getSectionPath(role)` — returns section root (`/student`, `/tutor`, `/admin`)

### Nav Item Shape

```js
{
  id: string,        // unique identifier
  labelKey: string,  // i18n translation key
  icon: Component,   // react-icons component
  path: string,      // route path
}
```

---

## Student Navigation

**Route prefix:** `/student`
**Protected by:** `ROLES.STUDENT`

### Sidebar Items

| ID | Label (i18n Key) | Icon | Path |
|----|-------------------|------|------|
| `dashboard` | `navbar.dashboard` | `FaHome` | `/student/dashboard` |
| `search` | `navbar.find_tutor` | `FaBook` | `/student/search` |
| `schedule` | `navbar.schedule` | `FaCalendar` | `/student/schedule` |
| `progress` | `navbar.progress` | `FaChartBar` | `/student/progress` |
| `messages` | `navbar.messages` | `FaEnvelope` | `/student/messages` |
| `support` | `navbar.support` | `FaLifeRing` | `/student/messages?filter=support` |

### BottomNav Items

| ID | Label (i18n Key) | Icon | Path |
|----|-------------------|------|------|
| `home` | `navbar.home` | `FaHome` | `/student/dashboard` |
| `search` | `navbar.find_tutor` | `FaBook` | `/student/search` |
| `messages` | `navbar.messages` | `FaEnvelope` | `/student/messages` |
| `support` | `navbar.support` | `FaLifeRing` | `/student/messages?filter=support` |
| `profile` | `navbar.profile` | `FaUsers` | `/student/profile` |

### Additional Pages (not in sidebar)

| Route | Page Component | i18n Title Key |
|-------|---------------|----------------|
| `/student/courses` | `PgStudentCourses` | `student_courses.title` |
| `/student/tutors` | `PgStudentTutors` | `student_tutors.title` |
| `/student/requests` | `PgStudentRequests` | `student_requests.title` |

---

## Tutor Navigation

**Route prefix:** `/tutor`
**Protected by:** `ROLES.TUTOR` and `ROLES.ADMIN`

### Sidebar Items

| ID | Label (i18n Key) | Icon | Path |
|----|-------------------|------|------|
| `dashboard` | `tutor_dashboard.title` | `FaHome` | `/tutor/dashboard` |
| `my_courses` | `profile.my_courses` | `FaBook` | `/tutor/courses` |
| `students` | `tutor_dashboard.students` | `FaUsers` | `/tutor/students` |
| `schedule` | `navbar.schedule` | `FaCalendar` | `/tutor/schedule` |
| `messages` | `navbar.messages` | `FaEnvelope` | `/tutor/messages` |
| `support` | `navbar.support` | `FaLifeRing` | `/tutor/messages?filter=support` |

### BottomNav Items

| ID | Label (i18n Key) | Icon | Path |
|----|-------------------|------|------|
| `dashboard` | `navbar.home` | `FaHome` | `/tutor/dashboard` |
| `courses` | `profile.my_courses` | `FaBook` | `/tutor/courses` |
| `messages` | `navbar.messages` | `FaEnvelope` | `/tutor/messages` |
| `support` | `navbar.support` | `FaLifeRing` | `/tutor/messages?filter=support` |
| `profile` | `navbar.profile` | `FaUsers` | `/tutor/profile` |

### Additional Pages (not in sidebar)

| Route | Page Component | i18n Title Key |
|-------|---------------|----------------|
| `/tutor/courses/new` | `PgCourse` | `tutor.create_course` |
| `/tutor/courses/create` | `PgCourse` | `tutor.create_course` |
| `/tutor/courses/edit/:courseId` | `PgCourse` (editMode) | — |
| `/tutor/application` | `PgTutorApplication` | `tutor.application` |

---

## Admin Navigation

**Route prefix:** `/admin`
**Protected by:** `ROLES.ADMIN` and `ROLES.SUPER_ADMIN`

### Sidebar Items

| ID | Label (i18n Key) | Icon | Path |
|----|-------------------|------|------|
| `admin_dashboard` | `admin.dashboard` | `FaHome` | `/admin` |
| `admin_users` | `admin.users` | `FaUsers` | `/admin/users` |
| `admin_tutors` | `admin.tutor_applications` | `FaBook` | `/admin/tutors` |
| `admin_courses` | `admin.course_moderation` | `FaChartBar` | `/admin/courses` |
| `admin_reviews` | `admin.reviews_moderation` | `FaEnvelope` | `/admin/reviews` |
| `admin_reports` | `admin.reports` | `FaCalendar` | `/admin/reports` |
| `admin_support` | `admin.support` | `FaLifeRing` | `/admin/support` |

### BottomNav Items

| ID | Label (i18n Key) | Icon | Path |
|----|-------------------|------|------|
| `dashboard` | `navbar.home` | `FaHome` | `/admin` |
| `users` | `admin.users` | `FaUsers` | `/admin/users` |
| `courses` | `admin.course_moderation` | `FaBook` | `/admin/courses` |
| `support` | `admin.support` | `FaLifeRing` | `/admin/support` |
| `settings` | `navbar.settings` | `FaCog` | `/admin/settings` |

### Additional Pages (not in sidebar)

| Route | Page Component |
|-------|---------------|
| `/admin/support/tickets/:id` | `PgAdminSupportTicket` |
| `/admin/profile` | `PgProfile` |
| `/admin/settings` | `PgSettings` |

---

## Sidebar

**File:** `src/components/Sidebar.jsx`

The Sidebar is a single component reused across all roles. It determines the active role via `useAuthStore` and selects the correct `SIDEBAR_ITEMS[roleKey]`.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | `false` | Controls mobile drawer open state |
| `onClose` | `function` | — | Callback to close mobile drawer |
| `collapsed` | `boolean` | `false` | Tablet mode: icon-only, 72px width |

### Behavior

- **Active state:** determined by `location.pathname` prefix matching against item paths; for query-param paths (`?filter=support`), exact match including search string
- **Footer items:** Notifications (with unread badge), Settings, Logout
- **User profile:** clickable avatar at the bottom navigates to `/{section}/profile`
- **Theme toggle:** dark/light mode switch in footer (hidden when collapsed)
- **Language selector:** EN/RU/KY dropdown in footer (hidden when collapsed)
- **Notification badge:** polls `/notifications/unread-count` every 30 seconds
- **Mobile:** clicking a nav item closes the drawer via `onClose`
- **Keyboard:** Escape key closes the mobile drawer

---

## BottomNav

**File:** `src/components/BottomNav.jsx`

Mobile-only navigation bar rendered at the root of `App.jsx` (outside routes).

### Visibility Rules

BottomNav is hidden when:
- User is not authenticated
- Current path is `/` (homepage)
- Current path matches detail pages: `/course/:id`, `/lesson/:id`, `/tutor/:id`

### Role Selection

```js
const roleKey = isAdminRole ? "admin" : isTutorRole ? "tutor" : "student";
const tabs = BOTTOMNAV_ITEMS[roleKey];
```

### Active State

- Exact match for query-param paths (e.g. `/student/messages?filter=support`)
- Prefix match for standard paths (e.g. `/student/schedule` matches `/student/schedule/123`)
- Special case: `/student/search` also matches `/find-tutors`

---

## Shared Pages

Several page components are reused across multiple roles. Each is wrapped by the appropriate role layout:

| Component | Student Route | Tutor Route | Admin Route |
|-----------|--------------|-------------|-------------|
| `PgSchedule` | `/student/schedule` | `/tutor/schedule` | — |
| `PgLessons` | `/student/lessons` | `/tutor/lessons` | — |
| `PgMessages` | `/student/messages` | `/tutor/messages` | — |
| `PgNotifications` | `/student/notifications` | `/tutor/notifications` | — |
| `PgProgress` | `/student/progress` | `/tutor/progress` | — |
| `PgProfile` | `/student/profile` | `/tutor/profile` | `/admin/profile` |
| `PgSettings` | `/student/settings` | `/tutor/settings` | `/admin/settings` |

These pages call `usePageTitle()` to dynamically set their mobile header title based on the current route.

---

## Key Patterns & Hooks

### `usePageTitle()`

**File:** `src/components/pageTitleContext.js`

A React Context hook that provides access to the `setTitle` function from `DashboardLayout`. Pages call it on mount to update the mobile header title.

```js
import { usePageTitle } from "../components/pageTitleContext";

const MyPage = () => {
  const setPageTitle = usePageTitle();

  useEffect(() => {
    setPageTitle("Page Title", "Optional subtitle");
  }, [setPageTitle]);

  return <div>...</div>;
};
```

`DashboardLayout` wraps its children in `PageTitleProvider` and maintains `dynamicTitle` / `dynamicSubtitle` state. The mobile header reads these values.

### `getPageTitle(roleKey, pathname)`

**File:** `src/config/navigation.js`

Returns an i18n translation key from `PAGE_TITLES` for the given role and pathname. Used by role layouts to resolve the initial title; individual pages can override via `usePageTitle()`.

```js
const titleKey = getPageTitle("student", "/student/dashboard");
// Returns "navbar.dashboard"
```

### `SIDEBAR_ITEMS[roleKey]`

Returns the array of navigation items for a role. Used by `Sidebar` and can be consumed by other components.

```js
const items = SIDEBAR_ITEMS["student"];
// [{ id: "dashboard", labelKey: "navbar.dashboard", icon: FaHome, path: "/student/dashboard" }, ...]
```

### `getDashboardPath(role)`

Returns the default dashboard URL for a role:

| Role | Returns |
|------|---------|
| `ADMIN` or `SUPER_ADMIN` | `/admin` |
| `TUTOR` | `/tutor/dashboard` |
| Default (STUDENT) | `/student/dashboard` |

### `getSectionPath(role)`

Returns the section root URL:

| Role | Returns |
|------|---------|
| `ADMIN` or `SUPER_ADMIN` | `/admin` |
| `TUTOR` | `/tutor` |
| Default (STUDENT) | `/student` |

---

## Route Reference

### Public Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `PgMain` | Landing page |
| `/login` | `Login` | Auth modal variant |
| `/register` | `RegisterPage` | Registration modal variant |
| `/forgot-password` | `PgForgotPassword` | |
| `/reset-password` | `PgResetPassword` | |
| `/verify-email` | `PgVerifyEmail` | |
| `/oauth/callback` | `PgOAuthCallback` | OAuth callback handler |
| `/oauth2/redirect` | `PgOAuthCallback` | OAuth callback handler (alternate) |
| `/search` | `PgSearch` | Public tutor search |
| `/find-tutors` | → `/search` | Redirect |
| `/course/:courseId` | `PgCourseView` | Public course detail |
| `/tutor/:tutorId` | `PgTutorProfile` | Public tutor profile |

### Student Routes

Protected by `ROLES.STUDENT`. All wrapped in `StudentLayout`.

| Path | Component |
|------|-----------|
| `/student` | → `/student/dashboard` (redirect) |
| `/student/dashboard` | `PgDashboard` |
| `/student/search` | `PgStudentSearch` |
| `/student/courses` | `PgStudentCourses` |
| `/student/tutors` | `PgStudentTutors` |
| `/student/requests` | `PgStudentRequests` |
| `/student/schedule` | `PgSchedule` |
| `/student/lessons` | `PgLessons` |
| `/student/messages` | `PgMessages` |
| `/student/notifications` | `PgNotifications` |
| `/student/progress` | `PgProgress` |
| `/student/profile` | `PgProfile` |
| `/student/settings` | `PgSettings` |

### Tutor Routes

Protected by `ROLES.TUTOR` and `ROLES.ADMIN`. All wrapped in `TutorLayout`.

| Path | Component |
|------|-----------|
| `/tutor` | → `/tutor/dashboard` (redirect) |
| `/tutor/application` | `PgTutorApplication` |
| `/tutor/dashboard` | `PgTutorDashboard` |
| `/tutor/courses` | `PgTutorCourses` |
| `/tutor/courses/new` | `PgCourse` |
| `/tutor/courses/create` | `PgCourse` |
| `/tutor/courses/edit/:courseId` | `PgCourse` (editMode) |
| `/tutor/students` | `PgTutorStudents` |
| `/tutor/schedule` | `PgSchedule` |
| `/tutor/lessons` | `PgLessons` |
| `/tutor/messages` | `PgMessages` |
| `/tutor/notifications` | `PgNotifications` |
| `/tutor/profile` | `PgProfile` |
| `/tutor/settings` | `PgSettings` |
| `/tutor/progress` | `PgProgress` |

### Admin Routes

Protected by `ROLES.ADMIN` and `ROLES.SUPER_ADMIN`. All wrapped in `AdminLayout`.

| Path | Component |
|------|-----------|
| `/admin` | `PgAdmin` |
| `/admin/users` | `PgAdminUsers` |
| `/admin/tutors` | `PgAdminTutors` |
| `/admin/courses` | `PgAdminCourses` |
| `/admin/reviews` | `PgAdminReviews` |
| `/admin/reports` | `PgAdminReports` |
| `/admin/support` | `PgAdminSupport` |
| `/admin/support/tickets/:id` | `PgAdminSupportTicket` |
| `/admin/profile` | `PgProfile` |
| `/admin/settings` | `PgSettings` |

### Shared Authenticated Routes

Protected by `ProtectedRoute` (any role).

| Path | Component |
|------|-----------|
| `/lesson/:bookingId` | `PgLesson` |
| `/become-tutor` | `PgBecomeTutor` |

### Support Redirects (any authenticated user)

| Path | Redirects To |
|------|-------------|
| `/support` | `/{section}/messages?filter=support` |
| `/support/new` | `/{section}/messages?filter=support` |
| `/support/tickets/:ticketId` | Handled by `SupportTicketRedirect` |

### Legacy Redirects

| Legacy Path | Redirects To |
|-------------|-------------|
| `/dashboard` | `/{section}/dashboard` |
| `/profile` | `/{section}/profile` |
| `/schedule` | `/{section}/schedule` |
| `/messages` | `/{section}/messages` |
| `/progress` | `/{section}/progress` |
| `/settings` | `/{section}/settings` |
| `/course` | `/tutor/courses/create` |
| `/course/edit/:courseId` | Handled by `CourseEditRedirect` |

### Error Pages

| Path | Component |
|------|-----------|
| `/403` | `PgForbidden` |
| `*` | `PgNotFound` |

---

## File Reference

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root component, all route definitions, BottomNav, Auth modals |
| `src/config/navigation.js` | `SIDEBAR_ITEMS`, `BOTTOMNAV_ITEMS`, `PAGE_TITLES`, helper functions |
| `src/constants/roles.js` | Role constants, helper functions, permissions |
| `src/components/DashboardLayout.jsx` | Shared layout: sidebar + mobile header + content area |
| `src/components/Sidebar.jsx` | Role-aware sidebar (fixed, collapsed, or drawer) |
| `src/components/BottomNav.jsx` | Mobile bottom navigation bar |
| `src/components/pageTitleContext.js` | `PageTitleProvider` and `usePageTitle` hook |
| `src/components/ProtectedRoute.jsx` | Route guard by role |
| `src/components/routes/RoleRedirect.jsx` | Role-based redirect helper |
| `src/layouts/StudentLayout.jsx` | Student layout wrapper (passes title to DashboardLayout) |
| `src/layouts/TutorLayout.jsx` | Tutor layout wrapper |
| `src/layouts/AdminLayout.jsx` | Admin layout wrapper |
| `src/styles/DashboardLayout.css` | Dashboard layout styles |
| `src/styles/Sidebar.css` | Sidebar styles |
| `src/styles/BottomNav.css` | Bottom nav styles |

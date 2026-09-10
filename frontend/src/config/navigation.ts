import {
  Home,
  BookOpen,
  Calendar,
  BarChart3,
  Mail,
  Settings,
  Users,
  Bell,
  LifeBuoy,
  Inbox,
  Search,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  path: string;
}

export type RoleKey = "user" | "student" | "tutor" | "admin";

// §5, §15: LMS routes hidden from main marketplace nav (course/booking/schedule/lesson/meeting/livekit not in MVP)
export const MARKETPLACE_ENABLED = true;

export const SIDEBAR_ITEMS: Record<RoleKey, NavItem[]> = {
  user: [
    { id: "overview", labelKey: "dashboard.overview", icon: Home, path: "/dashboard" },
    { id: "requests", labelKey: "navigation.requests", icon: Inbox, path: "/dashboard/requests" },
    { id: "resume", labelKey: "tutor.resume", icon: BookOpen, path: "/dashboard/resume" },
    { id: "support", labelKey: "navbar.support", icon: LifeBuoy, path: "/support" },
    { id: "profile", labelKey: "navbar.profile", icon: Users, path: "/dashboard/profile" },
    { id: "settings", labelKey: "navbar.settings", icon: Settings, path: "/dashboard/settings" },
  ],
  student: [
    { id: "home", labelKey: "navbar.home", icon: Home, path: "/" },
    { id: "search", labelKey: "navbar.find_tutor", icon: Search, path: "/tutors" },
    { id: "requests", labelKey: "navigation.requests", icon: Inbox, path: "/dashboard/requests" },
    { id: "profile", labelKey: "navbar.profile", icon: Users, path: "/profile" },
  ],
  tutor: [
    { id: "home", labelKey: "navbar.home", icon: Home, path: "/" },
    { id: "requests", labelKey: "navigation.requests", icon: Inbox, path: "/dashboard/requests" },
    { id: "resume", labelKey: "tutor.resume", icon: BookOpen, path: "/dashboard/resume" },
    { id: "profile", labelKey: "navbar.profile", icon: Users, path: "/profile" },
  ],
  admin: [
    { id: "admin_dashboard", labelKey: "admin.dashboard", icon: Home, path: "/admin" },
    { id: "admin_users", labelKey: "admin.users", icon: Users, path: "/admin/users" },
    { id: "admin_tutors", labelKey: "admin.tutor_applications", icon: BookOpen, path: "/admin/tutors" },
    { id: "admin_requests", labelKey: "navigation.requests", icon: Inbox, path: "/admin/requests" },
    { id: "admin_metrics", labelKey: "admin.metrics", icon: BarChart3, path: "/admin/metrics" },
    { id: "admin_support", labelKey: "admin.support", icon: LifeBuoy, path: "/admin/support" },
    { id: "admin_seo", labelKey: "admin.seo", icon: Settings, path: "/admin/seo" },
  ],
};

// Legacy items kept for hidden routes (not in main nav) — §26
export const SIDEBAR_ITEMS_LEGACY: Record<RoleKey, NavItem[]> = {
  student: [
    { id: "my_courses", labelKey: "student_courses.title", icon: BookOpen, path: "/student/courses" },
    { id: "schedule", labelKey: "navbar.schedule", icon: Calendar, path: "/student/schedule" },
    { id: "lessons", labelKey: "navbar.lessons", icon: BookOpen, path: "/student/lessons" },
    { id: "notifications", labelKey: "notifications.title", icon: Bell, path: "/student/notifications" },
    { id: "progress", labelKey: "navbar.progress", icon: BarChart3, path: "/student/progress" },
    { id: "support", labelKey: "navbar.support", icon: LifeBuoy, path: "/student/messages?filter=support" },
  ],
  tutor: [
    { id: "my_courses", labelKey: "profile.my_courses", icon: BookOpen, path: "/tutor/courses" },
    { id: "schedule", labelKey: "navbar.schedule", icon: Calendar, path: "/tutor/schedule" },
    { id: "lessons", labelKey: "navbar.lessons", icon: BookOpen, path: "/tutor/lessons" },
    { id: "notifications", labelKey: "notifications.title", icon: Bell, path: "/tutor/notifications" },
    { id: "progress", labelKey: "navbar.progress", icon: BarChart3, path: "/tutor/progress" },
    { id: "support", labelKey: "navbar.support", icon: LifeBuoy, path: "/tutor/messages?filter=support" },
  ],
  admin: [
    { id: "admin_reviews", labelKey: "admin.reviews_moderation", icon: Mail, path: "/admin/reviews" },
    { id: "admin_reports", labelKey: "admin.reports", icon: Calendar, path: "/admin/reports" },
  ],
};

// §16 mobile — marketplace bottom nav: Главная/Поиск/Обращения/Профиль (без Избранного fake)
// USER: Главная (homepage), Поиск, Обращения, Профиль — unified marketplace (spec §14)
// FIX: Главная теперь ведёт на "/" , а не на пустой "Мои заявки" ("/student/dashboard" удалён из основной навигации)
export const BOTTOMNAV_ITEMS: Record<RoleKey, NavItem[]> = {
  user: [
    { id: "home", path: "/", labelKey: "navbar.home", icon: Home },
    { id: "search", path: "/tutors", labelKey: "navbar.find_tutor", icon: Search },
    { id: "requests", path: "/dashboard/requests", labelKey: "navigation.requests", icon: Inbox },
    { id: "profile", path: "/profile", labelKey: "navbar.profile", icon: Users },
  ],
  student: [
    { id: "home", path: "/", labelKey: "navbar.home", icon: Home },
    { id: "search", path: "/tutors", labelKey: "navbar.find_tutor", icon: Search },
    { id: "requests", path: "/dashboard/requests", labelKey: "navigation.requests", icon: Inbox },
    { id: "profile", path: "/profile", labelKey: "navbar.profile", icon: Users },
  ],
  tutor: [
    { id: "home", path: "/", labelKey: "navbar.home", icon: Home },
    { id: "search", path: "/tutors", labelKey: "navbar.find_tutor", icon: Search },
    { id: "requests", path: "/dashboard/requests", labelKey: "navigation.requests", icon: Inbox },
    { id: "profile", path: "/profile", labelKey: "navbar.profile", icon: Users },
  ],
  admin: [
    { id: "dashboard", path: "/admin", labelKey: "navbar.home", icon: Home },
    { id: "users", path: "/admin/users", labelKey: "admin.users", icon: Users },
    { id: "tutors", path: "/admin/tutors", labelKey: "admin.tutor_applications", icon: Users },
    { id: "requests", path: "/admin/requests", labelKey: "navigation.requests", icon: Inbox },
    { id: "support", path: "/admin/support", labelKey: "admin.support", icon: LifeBuoy },
  ],
};

export const PAGE_TITLES: Record<RoleKey, Record<string, string>> = {
  user: {
    "/dashboard": "dashboard.overview",
    "/dashboard/requests": "navigation.requests",
    "/dashboard/resume": "tutor.resume",
    "/dashboard/profile": "navbar.profile",
    "/dashboard/settings": "navbar.settings",
    "/profile": "navbar.profile",
    "/tutors": "navbar.find_tutor",
    "/tutor/:slug": "tutor_profile.title",
    "/become-tutor": "tutor.resume",
  },
  student: {
    "/student/dashboard": "student_requests.title",
    "/student/search": "navbar.find_tutor",
    "/student/requests": "navigation.requests",
    "/dashboard/requests": "navigation.requests",
    "/dashboard/resume": "tutor.resume",
    "/student/profile": "navbar.profile",
    // legacy — hidden from main nav
    "/student/schedule": "navbar.schedule",
    "/student/lessons": "navbar.lessons",
    "/student/progress": "navbar.progress",
    "/student/messages": "navbar.messages",
    "/student/notifications": "notifications.title",
    "/student/settings": "navbar.settings",
    "/student/courses": "student_courses.title",
    "/student/tutors": "student_tutors.title",
  },
  tutor: {
    "/tutor/dashboard": "tutor.application",
    "/tutor/requests": "navigation.requests",
    "/dashboard/requests": "navigation.requests",
    "/dashboard/resume": "tutor.resume",
    "/tutor/application": "tutor.application",
    "/tutor/stats": "admin.metrics",
    "/tutor/profile": "navbar.profile",
    // legacy — hidden from main nav
    "/tutor/courses": "profile.my_courses",
    "/tutor/courses/new": "tutor.create_course",
    "/tutor/courses/create": "tutor.create_course",
    "/tutor/students": "tutor_dashboard.students",
    "/tutor/schedule": "navbar.schedule",
    "/tutor/lessons": "navbar.lessons",
    "/tutor/messages": "navbar.messages",
    "/tutor/notifications": "notifications.title",
    "/tutor/settings": "navbar.settings",
    "/tutor/progress": "navbar.progress",
  },
  admin: {
    "/admin": "admin.dashboard",
    "/admin/metrics": "admin.metrics",
    "/admin/users": "admin.users",
    "/admin/tutors": "admin.tutor_applications",
    "/admin/requests": "navigation.requests",
    "/admin/reviews": "admin.reviews_moderation",
    "/admin/reports": "admin.reports",
    "/admin/support": "admin.support",
    "/admin/seo": "admin.seo",
    "/admin/profile": "navbar.profile",
    "/admin/settings": "navbar.settings",
  },
};

export const getPageTitle = (roleKey: string, pathname: string): string => {
  const titles = PAGE_TITLES[roleKey as RoleKey] ?? {};
  return titles[pathname] ?? "";
};

export const getDashboardPath = (role: unknown): string => {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  // USER hub: /dashboard — единый dashboard для USER (не отдельный Tutor/Student Dashboard)
  // Homepage "/" остаётся публичной, а кнопка "Главная" в шапке (navbar.dashboard) для авторизованного USER ведёт в дашборд
  if (role === "USER" || role === "STUDENT" || role === "TUTOR") return "/dashboard";
  // fallback for isUser-like strings
  if (typeof role === "string" && ["USER", "STUDENT", "TUTOR"].includes(role)) return "/dashboard";
  return "/";
};

export const getSectionPath = (role: unknown): string => {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  if (role === "USER") return "";
  if (role === "TUTOR") return "/tutor";
  return "/student";
};

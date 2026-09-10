import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import RoleRedirect from "../../components/routes/RoleRedirect";
import SupportTicketRedirect from "../../components/routes/SupportTicketRedirect";
import RestoreContactIntent from "../../components/RestoreContactIntent";
import ErrorBoundary from "../../components/ErrorBoundary";
import SeoNoindex from "../../components/SeoNoindex";
import i18n from "../../i18n";
import { initAnalytics, trackPageView } from "../../utils/analytics";
import { StudentRoutes } from "./StudentRoutes";
import { TutorRoutes } from "./TutorRoutes";
import { AdminRoutes } from "./AdminRoutes";
import UserDashboardLayout from "../../layouts/UserDashboardLayout";

const withBoundary = (node: React.ReactNode): React.ReactNode => <ErrorBoundary>{node}</ErrorBoundary>;

const PgLesson = lazy(() => import("../../pages/PgLesson"));
const PgBecomeTutor = lazy(() => import("../../pages/PgBecomeTutor"));
const PgMain = lazy(() => import("../../pages/PgMain"));
const PgSearch = lazy(() => import("../../pages/PgSearch"));
const PgTutorProfile = lazy(() => import("../../pages/PgTutorProfile"));
const PgTutors = lazy(() => import("../../pages/PgTutors"));
const PgTutorMarketplace = lazy(() => import("../../features/tutors/components/TutorProfileMarketplace"));
const PgMarketplaceChat = lazy(() => import("../../pages/PgMarketplaceChat"));
const PgUserDashboard = lazy(() => import("../../pages/PgUserDashboard"));
const PgDashboardResume = lazy(() => import("../../pages/PgDashboardResume"));
const PgProfile = lazy(() => import("../../pages/PgProfile"));
const PgSettings = lazy(() => import("../../pages/PgSettings"));
const PgConversations = lazy(() => import("../../pages/PgConversations"));
const PgNotFound = lazy(() => import("../../pages/PgNotFound"));
const PgForbidden = lazy(() => import("../../pages/PgForbidden"));
const PgOAuthCallback = lazy(() => import("../../pages/PgOAuthCallback"));
const PgForgotPassword = lazy(() => import("../../pages/PgForgotPassword"));
const PgResetPassword = lazy(() => import("../../pages/PgResetPassword"));
const PgVerifyEmail = lazy(() => import("../../pages/PgVerifyEmail"));
const PgSupport = lazy(() => import("../../pages/PgSupport"));
const PgSupportNew = lazy(() => import("../../pages/PgSupportNew"));
const PgSupportTicket = lazy(() => import("../../pages/PgSupportTicket"));
const Login = lazy(() => import("../../components/routes/Login"));
const RegisterPage = lazy(() => import("../../components/routes/RegisterPage"));

const PageLoader = (): JSX.Element => <div className="loading-screen" role="status" aria-live="polite">{i18n.t("common.loading", "Loading...")}</div>;

export function AppRouter(): JSX.Element {
  const location = useLocation();

  // GA4: report public page views only (private areas are filtered inside trackPageView)
  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search, document.title);
  }, [location.pathname, location.search]);

  return (
    <>
      <SeoNoindex />
      <RestoreContactIntent />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={withBoundary(<PgMain />)} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<PgForgotPassword />} />
        <Route path="/reset-password" element={<PgResetPassword />} />
        <Route path="/verify-email" element={<PgVerifyEmail />} />
        <Route path="/oauth/callback" element={<PgOAuthCallback />} />
        <Route path="/oauth2/redirect" element={<PgOAuthCallback />} />
        {/* Marketplace — §5 — canonical /tutors, aliases 301 to canonical for SEO */}
        <Route path="/tutors" element={withBoundary(<PgTutors />)} />
        <Route path="/repetitors" element={<Navigate to="/tutors" replace />} />
        <Route path="/repetitors/:subject" element={<Navigate to="/tutors" replace />} />
        <Route path="/repetitors/:subject/:city" element={<Navigate to="/tutors" replace />} />
        <Route path="/tutor/:tutorId" element={withBoundary(<PgTutorMarketplace />)} />
        <Route path="/repetitor/:subject/:slug" element={<Navigate to="/tutors" replace />} />
        <Route path="/become-tutor" element={withBoundary(<PgBecomeTutor />)} />

        <Route path="/search" element={withBoundary(<PgSearch />)} />
        <Route path="/find-tutors" element={<Navigate to="/tutors" replace />} />
        {/* COURSE SYSTEM REMOVED — marketplace uses /tutors and /dashboard/requests */}
        <Route path="/course/:courseId" element={<Navigate to="/tutors" replace />} />
        <Route path="/403" element={<PgForbidden />} />
        {/* Unified marketplace dashboard for USER — spec §14, §15 — USER remains USER, RESUME defines ability */}
        <Route element={<ProtectedRoute roles={["USER", "ADMIN", "SUPER_ADMIN", "STUDENT", "TUTOR"]} />}>
          <Route element={<UserDashboardLayout />}>
            <Route path="/dashboard" element={withBoundary(<PgUserDashboard />)} />
            <Route path="/dashboard/resume" element={withBoundary(<PgDashboardResume />)} />
            <Route path="/dashboard/requests" element={withBoundary(<PgMarketplaceChat />)} />
            <Route path="/dashboard/requests/:requestId" element={withBoundary(<PgMarketplaceChat />)} />
            <Route path="/dashboard/profile" element={withBoundary(<PgProfile />)} />
            <Route path="/dashboard/settings" element={withBoundary(<PgSettings />)} />
          </Route>
          {/* backward compat: /profile — role-aware */}
          <Route path="/profile" element={<RoleRedirect student="/student/profile" tutor="/tutor/profile" admin="/admin/profile" user="/dashboard/profile" />} />
        </Route>
        {/* LEGACY EdTech routes — DEPRECATED, hidden from nav, but kept for backward compat (see LEGACY_EDTECH.md) */}
        <Route path="/schedule" element={<RoleRedirect student="/student/schedule" tutor="/tutor/schedule" admin="/admin" />} />
        <Route path="/lessons" element={<Navigate to="/dashboard" replace />} />
        <Route path="/my-lessons" element={<Navigate to="/dashboard" replace />} />
        <Route path="/bookings" element={<Navigate to="/dashboard/requests" replace />} />
        <Route path="/booking/:id" element={<Navigate to="/dashboard/requests" replace />} />
        <Route path="/meeting" element={<Navigate to="/dashboard" replace />} />
        <Route path="/meetings" element={<Navigate to="/dashboard" replace />} />
        <Route path="/meeting/:id" element={<Navigate to="/dashboard" replace />} />
        <Route path="/homework" element={<Navigate to="/dashboard" replace />} />
        <Route path="/calendar" element={<Navigate to="/schedule" replace />} />
        <Route path="/messages" element={<RoleRedirect student="/student/messages" tutor="/tutor/messages" admin="/admin/support" />} />
        <Route path="/progress" element={<RoleRedirect student="/student/progress" tutor="/tutor/progress" admin="/admin/metrics" />} />
        <Route path="/settings" element={<RoleRedirect student="/student/settings" tutor="/tutor/settings" admin="/admin/settings" />} />
        {/* COURSE CREATION REMOVED — redirect legacy /course* to marketplace */}
        <Route path="/course" element={<Navigate to="/dashboard" replace />} />
        <Route path="/course/edit/:courseId" element={<Navigate to="/dashboard" replace />} />
        {StudentRoutes()}
        {TutorRoutes()}

        {/* Marketplace Chat — legacy conversations (outside dashboard layout) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/conversations" element={withBoundary(<PgConversations />)} />
          <Route path="/conversations/:conversationId" element={withBoundary(<PgConversations />)} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/lesson/:bookingId" element={withBoundary(<PgLesson />)} />
        </Route>

        <Route element={<ProtectedRoute roles={["USER", "ADMIN", "SUPER_ADMIN", "STUDENT", "TUTOR"]} />}>
          <Route path="/support" element={withBoundary(<PgSupport />)} />
          <Route path="/support/new" element={withBoundary(<PgSupportNew />)} />
          <Route path="/support/tickets/:ticketId" element={withBoundary(<PgSupportTicket />)} />
        </Route>

        {AdminRoutes()}

        <Route path="*" element={withBoundary(<LazyNotFound />)} />
      </Routes>
      </Suspense>
    </>
  );
}

const LazyNotFound = lazy(() => import("../../pages/PgNotFound"));

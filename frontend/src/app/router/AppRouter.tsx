import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import RestoreContactIntent from "../../components/RestoreContactIntent";
import ErrorBoundary from "../../components/ErrorBoundary";
import SeoNoindex from "../../components/SeoNoindex";
import i18n from "../../i18n";
import { initAnalytics, trackPageView } from "../../utils/analytics";
import { AdminRoutes } from "./AdminRoutes";
import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";
import useAuthStore from "../../store/authStore";

const withBoundary = (node: React.ReactNode): React.ReactNode => <ErrorBoundary>{node}</ErrorBoundary>;

const PgLesson = lazy(() => import("../../pages/PgLesson"));
const PgBecomeTutor = lazy(() => import("../../pages/PgBecomeTutor"));
const PgMain = lazy(() => import("../../pages/PgMain"));
const PgSearch = lazy(() => import("../../pages/PgSearch"));
const PgTutors = lazy(() => import("../../pages/PgTutors"));
const PgTutorMarketplace = lazy(() => import("../../features/tutors/components/TutorProfileMarketplace"));
const PgUserDashboard = lazy(() => import("../../pages/PgUserDashboard"));
const PgDashboardResume = lazy(() => import("../../pages/PgDashboardResume"));
const PgResumeEditor = lazy(() => import("../../pages/PgResumeEditor"));
const PgResumePreview = lazy(() => import("../../pages/PgResumePreview"));
const PgShare = lazy(() => import("../../pages/PgShare"));
const PgFavorites = lazy(() => import("../../pages/PgFavorites"));
const PgProfile = lazy(() => import("../../pages/PgProfile"));
const PgSettings = lazy(() => import("../../pages/PgSettings"));
const PgNotFound = lazy(() => import("../../pages/PgNotFound"));
const PgForbidden = lazy(() => import("../../pages/PgForbidden"));
const PgOAuthCallback = lazy(() => import("../../pages/PgOAuthCallback"));
const PgForgotPassword = lazy(() => import("../../pages/PgForgotPassword"));
const PgResetPassword = lazy(() => import("../../pages/PgResetPassword"));
const PgVerifyEmail = lazy(() => import("../../pages/PgVerifyEmail"));
const PgSupport = lazy(() => import("../../pages/PgSupport"));
const PgSupportNew = lazy(() => import("../../pages/PgSupportNew"));
const PgSupportTicket = lazy(() => import("../../pages/PgSupportTicket"));
const PgLegal = lazy(() => import("../../pages/PgLegal"));
const Login = lazy(() => import("../../components/routes/Login"));
const RegisterPage = lazy(() => import("../../components/routes/RegisterPage"));

// App pages reuse existing Pg* — no copies, single source of truth
const AppMessages = lazy(() => import("../pages/AppMessages"));

const PageLoader = (): JSX.Element => <div className="loading-screen" role="status" aria-live="polite">{i18n.t("common.loading", "Loading...")}</div>;

export function AppRouter(): JSX.Element {
  const location = useLocation();

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
          {/* Auth pages — standalone (SEO noindex via SeoNoindex) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<PgForgotPassword />} />
          <Route path="/reset-password" element={<PgResetPassword />} />
          <Route path="/verify-email" element={<PgVerifyEmail />} />
          <Route path="/oauth/callback" element={<PgOAuthCallback />} />
          <Route path="/oauth2/redirect" element={<PgOAuthCallback />} />

          {/* Public Website — PublicLayout (index, crawlable) — guests only, auth normalizes to /app/* */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={withBoundary(<PgMain />)} />
            <Route path="/tutors" element={<PublicTutorsGuard />} />
            <Route path="/repetitors" element={<Navigate to="/tutors" replace />} />
            <Route path="/repetitors/:subject" element={<Navigate to="/tutors" replace />} />
            <Route path="/repetitors/:subject/:city" element={<Navigate to="/tutors" replace />} />
            <Route path="/tutor/:tutorId" element={<PublicTutorGuard />} />
            <Route path="/repetitor/:subject/:slug" element={<PublicTutorGuard />} />
            <Route path="/repetitor/:slug" element={<PublicTutorGuard />} />
            {/* canonical subject/city SEO pages -> reuse PgTutors */}
            <Route path="/subjects/:slug" element={<PublicTutorsGuard />} />
            <Route path="/cities/:slug" element={<PublicTutorsGuard />} />
            <Route path="/become-tutor" element={withBoundary(<PgBecomeTutor />)} />
            <Route path="/share/:token" element={withBoundary(<PgShare />)} />
            <Route path="/search" element={<PublicTutorsGuard />} />
            <Route path="/find-tutors" element={<Navigate to="/tutors" replace />} />
            <Route path="/course/:courseId" element={<Navigate to="/tutors" replace />} />
            <Route path="/legal/:type" element={withBoundary(<PgLegal />)} />
            <Route path="/403" element={<PgForbidden />} />
          </Route>

          {/* Authenticated App — /app/* with AppLayout (noindex) — single source, no copies */}
          <Route element={<ProtectedRoute roles={["USER", "ADMIN", "SUPER_ADMIN", "STUDENT", "TUTOR"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/app/dashboard" element={withBoundary(<PgUserDashboard />)} />
              <Route path="/app/tutors" element={withBoundary(<PgTutors />)} />
              <Route path="/app/tutor/:tutorId" element={withBoundary(<PgTutorMarketplace />)} />
              <Route path="/app/repetitor/:subject/:slug" element={withBoundary(<PgTutorMarketplace />)} />
              <Route path="/app/repetitor/:slug" element={withBoundary(<PgTutorMarketplace />)} />
              <Route path="/app/search" element={withBoundary(<PgSearch />)} />
              <Route path="/app/resumes" element={withBoundary(<PgDashboardResume />)} />
              <Route path="/app/resumes/new" element={withBoundary(<PgBecomeTutor />)} />
              <Route path="/app/resumes/edit" element={withBoundary(<PgResumeEditor />)} />
              <Route path="/app/resumes/preview" element={withBoundary(<PgResumePreview />)} />
              <Route path="/app/favorites" element={withBoundary(<PgFavorites />)} />
              <Route path="/app/messages" element={withBoundary(<AppMessages />)} />
              <Route path="/app/messages/:conversationId" element={withBoundary(<AppMessages />)} />
              <Route path="/app/profile" element={withBoundary(<PgProfile />)} />
              <Route path="/app/settings" element={withBoundary(<PgSettings />)} />
              <Route path="/app/support" element={withBoundary(<PgSupport />)} />
              <Route path="/app/support/new" element={withBoundary(<PgSupportNew />)} />
              <Route path="/app/support/tickets/:ticketId" element={withBoundary(<PgSupportTicket />)} />
            </Route>
          </Route>

          {/* Legacy — 301 to /app/* (no duplicate rendering, just redirects) */}
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/dashboard/resume" element={<Navigate to="/app/resumes" replace />} />
          <Route path="/dashboard/resume/edit" element={<Navigate to="/app/resumes/edit" replace />} />
          <Route path="/dashboard/resume/preview" element={<Navigate to="/app/resumes/preview" replace />} />
          <Route path="/dashboard/favorites" element={<Navigate to="/app/favorites" replace />} />
          <Route path="/dashboard/requests" element={<Navigate to="/app/messages" replace />} />
          <Route path="/dashboard/requests/:requestId" element={<Navigate to="/app/messages" replace />} />
          <Route path="/dashboard/profile" element={<Navigate to="/app/profile" replace />} />
          <Route path="/dashboard/settings" element={<Navigate to="/app/settings" replace />} />
          <Route path="/dashboard/*" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
          {/* LEGACY routes — 1.2: dead RoleRedirect targets fixed to existing /app/* */}
          <Route path="/schedule" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/lessons" element={<Navigate to="/dashboard" replace />} />
          <Route path="/my-lessons" element={<Navigate to="/dashboard" replace />} />
          <Route path="/bookings" element={<Navigate to="/dashboard/requests" replace />} />
          <Route path="/booking/:id" element={<Navigate to="/dashboard/requests" replace />} />
          <Route path="/meeting" element={<Navigate to="/dashboard" replace />} />
          <Route path="/meetings" element={<Navigate to="/dashboard" replace />} />
          <Route path="/meeting/:id" element={<Navigate to="/dashboard" replace />} />
          <Route path="/homework" element={<Navigate to="/dashboard" replace />} />
          <Route path="/calendar" element={<Navigate to="/schedule" replace />} />
          <Route path="/messages" element={<Navigate to="/app/messages" replace />} />
          <Route path="/progress" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
          <Route path="/student/settings" element={<Navigate to="/dashboard/settings" replace />} />
          <Route path="/tutor/settings" element={<Navigate to="/dashboard/settings" replace />} />
          <Route path="/student/profile" element={<Navigate to="/dashboard/profile" replace />} />
          <Route path="/tutor/profile" element={<Navigate to="/dashboard/profile" replace />} />
          <Route path="/course" element={<Navigate to="/dashboard" replace />} />
          <Route path="/course/edit/:courseId" element={<Navigate to="/dashboard" replace />} />

          {/* Legacy conversations -> /app/messages (preserve id) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/conversations" element={<Navigate to="/app/messages" replace />} />
            <Route path="/conversations/:conversationId" element={<ConversationsLegacyRedirect />} />
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

          <Route path="*" element={withBoundary(<PgNotFound />)} />
        </Routes>
      </Suspense>
    </>
  );
}

function ConversationsLegacyRedirect(): JSX.Element {
  const { conversationId } = useParams() as { conversationId?: string };
  if (conversationId) return <Navigate to={`/app/messages/${conversationId}`} replace />;
  return <Navigate to="/app/messages" replace />;
}

function PublicTutorsGuard(): JSX.Element {
  const { isAuthenticated, status } = useAuthStore();
  if (status === "initializing") return withBoundary(<PgTutors />) as JSX.Element;
  if (isAuthenticated) return <Navigate to="/app/tutors" replace />;
  return withBoundary(<PgTutors />) as JSX.Element;
}

function PublicTutorGuard(): JSX.Element {
  const { isAuthenticated, status } = useAuthStore();
  const params = useParams() as Record<string, string | undefined>;
  const id = params.tutorId || params.slug || params.subject || "";
  const path = window.location.pathname;
  if (status === "initializing") return withBoundary(<PgTutorMarketplace />) as JSX.Element;
  if (isAuthenticated) {
    // normalize /tutor/:id -> /app/tutor/:id, /repetitor/* -> /app/repetitor/*
    const appPath = path.startsWith("/app") ? path : `/app${path}`;
    // for /tutor fallback keep id
    if (path.startsWith("/tutor/") && id) return <Navigate to={`/app/tutor/${id}`} replace />;
    if (path.startsWith("/repetitor/")) return <Navigate to={appPath} replace />;
    if (path === "/search") return <Navigate to="/app/search" replace />;
    if (path.startsWith("/subjects/") || path.startsWith("/cities/")) return <Navigate to={appPath} replace />;
    return <Navigate to={`/app/tutor/${id || ""}`.replace(/\/$/, "")} replace />;
  }
  return withBoundary(<PgTutorMarketplace />) as JSX.Element;
}

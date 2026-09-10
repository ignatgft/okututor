import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import TutorLayout from "../../layouts/TutorLayout";
import ErrorBoundary from "../../components/ErrorBoundary";
import { ROLES } from "../../constants/roles";

const withBoundary = (node: React.ReactNode): React.ReactNode => <ErrorBoundary>{node}</ErrorBoundary>;

const PgTutorApplication = lazy(() => import("../../pages/PgTutorApplication"));
const PgTutorDashboard = lazy(() => import("../../pages/PgTutorDashboard"));
const PgTutorRequests = lazy(() => import("../../pages/PgTutorRequests"));
const PgTutorRequestDetail = lazy(() => import("../../pages/PgTutorRequestDetail"));
const PgTutorStudents = lazy(() => import("../../pages/PgTutorStudents"));
const PgSchedule = lazy(() => import("../../pages/Schedule/SchedulePage"));
const PgLessons = lazy(() => import("../../pages/PgLessons"));
const PgMessages = lazy(() => import("../../pages/PgMessages"));
const PgNotifications = lazy(() => import("../../pages/PgNotifications"));
const PgProfile = lazy(() => import("../../pages/PgProfile"));
const PgSettings = lazy(() => import("../../pages/PgSettings"));
const PgProgress = lazy(() => import("../../pages/PgProgress"));
const PgTutorStats = lazy(() => import("../../pages/PgTutorStats"));

export function TutorRoutes(): React.ReactNode {
  return (
    <Route element={<ProtectedRoute roles={[ROLES.USER, ROLES.TUTOR]} />}>
      <Route element={<TutorLayout />}>
        <Route path="/tutor" element={<Navigate to="/" replace />} />
        {/* LEGACY: /tutor/dashboard & /tutor/requests removed from marketplace nav — unified at /dashboard/* */}
        <Route path="/tutor/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tutor/requests" element={<Navigate to="/dashboard/requests" replace />} />
        <Route path="/tutor/requests/:id" element={<Navigate to="/dashboard/requests" replace />} />
        <Route path="/tutor/application" element={<PgTutorApplication />} />
        <Route path="/tutor/stats" element={withBoundary(<PgTutorStats />)} />
        {/* COURSE CREATION REMOVED — marketplace model uses RESUME, not courses (see docs) */}
        <Route path="/tutor/courses" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tutor/courses/new" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tutor/courses/create" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tutor/courses/edit/:courseId" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tutor/students" element={<PgTutorStudents />} />
        {/* LEGACY EdTech — hidden from marketplace nav (DEPRECATED, keep for future) */}
        <Route path="/tutor/schedule" element={withBoundary(<PgSchedule />)} />
        <Route path="/tutor/lessons" element={<PgLessons />} />
        <Route path="/tutor/messages" element={withBoundary(<PgMessages />)} />
        <Route path="/tutor/notifications" element={<PgNotifications />} />
        <Route path="/tutor/profile" element={withBoundary(<PgProfile />)} />
        <Route path="/tutor/settings" element={<PgSettings />} />
        <Route path="/tutor/progress" element={<PgProgress />} />
      </Route>
    </Route>
  );
}

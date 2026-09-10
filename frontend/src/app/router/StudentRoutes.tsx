import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import StudentLayout from "../../layouts/StudentLayout";
import ErrorBoundary from "../../components/ErrorBoundary";
import { ROLES } from "../../constants/roles";

const withBoundary = (node: React.ReactNode): React.ReactNode => <ErrorBoundary>{node}</ErrorBoundary>;

const PgDashboard = lazy(() => import("../../pages/PgDashboard"));
const PgStudentSearch = lazy(() => import("../../pages/PgStudentSearch"));
const PgStudentTutors = lazy(() => import("../../pages/PgStudentTutors"));
const PgStudentRequests = lazy(() => import("../../pages/PgStudentRequests"));
const PgStudentRequestDetail = lazy(() => import("../../pages/PgStudentRequestDetail"));
const PgSchedule = lazy(() => import("../../pages/Schedule/SchedulePage"));
const PgLessons = lazy(() => import("../../pages/PgLessons"));
const PgMessages = lazy(() => import("../../pages/PgMessages"));
const PgNotifications = lazy(() => import("../../pages/PgNotifications"));
const PgProgress = lazy(() => import("../../pages/PgProgress"));
const PgProfile = lazy(() => import("../../pages/PgProfile"));
const PgSettings = lazy(() => import("../../pages/PgSettings"));

export function StudentRoutes(): React.ReactNode {
  return (
    <Route element={<ProtectedRoute roles={[ROLES.STUDENT, ROLES.USER]} />}>
      <Route element={<StudentLayout />}>
        <Route path="/student" element={<Navigate to="/" replace />} />
        {/* LEGACY: /student/dashboard (old "Мои заявки") removed from main nav — now redirects to marketplace home.
            Kept as file PgDashboard for dependency analysis, not routed as primary. */}
        <Route path="/student/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/student/search" element={<PgStudentSearch />} />
        {/* COURSE SYSTEM REMOVED — marketplace: use /tutors and /dashboard/requests */}
        <Route path="/student/courses" element={<Navigate to="/dashboard" replace />} />
        <Route path="/student/tutors" element={<PgStudentTutors />} />
        <Route path="/student/requests" element={<Navigate to="/dashboard/requests" replace />} />
        <Route path="/student/requests/:id" element={<Navigate to="/dashboard/requests" replace />} />
        {/* LEGACY EdTech — hidden from marketplace nav, kept for backward compat */}
        <Route path="/student/schedule" element={withBoundary(<PgSchedule />)} />
        <Route path="/student/lessons" element={<PgLessons />} />
        <Route path="/student/messages" element={withBoundary(<PgMessages />)} />
        <Route path="/student/notifications" element={<PgNotifications />} />
        <Route path="/student/progress" element={<PgProgress />} />
        <Route path="/student/profile" element={withBoundary(<PgProfile />)} />
        <Route path="/student/settings" element={<PgSettings />} />
      </Route>
    </Route>
  );
}

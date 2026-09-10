// migrated to TSX — minimal strict types (controlled)
import { Navigate } from "react-router-dom";
import { isTutorLike, isAdmin, isUser } from "../../constants/roles";
import useAuthStore from "../../store/authStore";

interface RoleRedirectProps {
  student: string;
  tutor: string;
  admin?: string;
  user?: string;
}

/**
 * Role-based redirect helper. Supports unified USER model.
 * Admins go to `admin`, USER goes to `user` (or student fallback), TUTOR/STUDENT legacy to tutor/student.
 */
export default function RoleRedirect({ student, tutor, admin, user }: RoleRedirectProps) {
  const { user: authUser } = useAuthStore();
  const role = authUser?.role;

  if (isAdmin(role) && admin) {
    return <Navigate to={admin} replace />;
  }
  if (isUser(role) && user) {
    return <Navigate to={user} replace />;
  }
  // Legacy: STUDENT/TUTOR still redirect to their areas, but USER fallback to user|student
  if (isUser(role)) {
    return <Navigate to={user ?? student} replace />;
  }
  return <Navigate to={isTutorLike(role) ? tutor : student} replace />;
}

import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import { getPageTitle } from "../config/navigation";

export default function UserDashboardLayout(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  // resolve title for /dashboard/* paths; fallback to dashboard.overview for exact /dashboard
  let titleKey = getPageTitle("user", location.pathname);
  // handle nested routes like /dashboard/requests/:id
  if (!titleKey) {
    if (location.pathname.startsWith("/dashboard/requests")) titleKey = "navigation.requests";
    else if (location.pathname.startsWith("/dashboard/resume")) titleKey = "tutor.resume";
    else if (location.pathname.startsWith("/dashboard/profile")) titleKey = "navbar.profile";
    else if (location.pathname.startsWith("/dashboard/settings")) titleKey = "navbar.settings";
    else if (location.pathname === "/dashboard") titleKey = "dashboard.overview";
  }
  const title = titleKey ? (t(titleKey) as string) : "";
  return <DashboardLayout title={title} />;
}

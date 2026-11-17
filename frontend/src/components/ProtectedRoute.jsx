
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        Checking authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isChangePasswordPage =
    location.pathname === "/change-password";

  if (user?.must_change_password && !isChangePasswordPage) {
    return <Navigate to="/change-password" replace />;
  }

  if (
    !user?.must_change_password &&
    isChangePasswordPage
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user?.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
}

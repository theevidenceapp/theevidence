import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore, type UserRole } from "@/store/adminAuthStore";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {

  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="h-screen justify-center place-content-center text-xl">
        Loading...
      </div>
    )
  }

  if (!accessToken) {
    return <Navigate to='/' replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to='/unauthorized-access' replace />
  }

  return <Outlet />
}

export default ProtectedRoute

import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/scheduling" : "/login"} replace />;
}

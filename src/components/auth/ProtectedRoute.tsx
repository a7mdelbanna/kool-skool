
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = "/auth" 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log("ProtectedRoute - Auth state:", { 
      isAuthenticated, 
      isLoading, 
      user, 
      path: location.pathname 
    });
  }, [isAuthenticated, isLoading, user, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Special case for account creation pages - don't redirect
  if (location.pathname.includes("/auth/create-account/")) {
    console.log("On account creation page, allowing access");
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to", redirectTo);
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Special case for onboarding - ensure we don't redirect away from it
  if (location.pathname === "/onboarding") {
    console.log("On onboarding page, allowing access");
    return <>{children}</>;
  }

  console.log("Authenticated, rendering protected content");
  return <>{children}</>;
};

export default ProtectedRoute;

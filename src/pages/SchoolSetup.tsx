
import React, { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import SubscriptionInfo from "@/components/school-setup/SubscriptionInfo";
import LicenseManager from "@/components/school-setup/LicenseManager";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SchoolSetup = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Use RPC function to get role safely
          const { data: roleData, error: roleError } = await supabase
            .rpc('get_current_user_role');
            
          if (roleError) {
            console.error("Error fetching user role:", roleError);
            setError("Failed to fetch user role. Please try again.");
          } else {
            setUserRole(roleData || null);
          }
        } catch (err) {
          console.error("Error in fetchUserRole:", err);
          setError("An unexpected error occurred. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchUserRole();
  }, [user]);

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container space-y-6 py-6">
      <h1 className="text-3xl font-bold">School Setup</h1>
      
      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>School Administration</AlertTitle>
        <AlertDescription>
          View your school subscription and manage staff members.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-6">
        <SubscriptionInfo />
        
        {/* Only show license manager for admin users */}
        {userRole === 'admin' && <LicenseManager />}
      </div>
    </div>
  );
};

export default SchoolSetup;

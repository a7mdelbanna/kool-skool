
import React, { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import SubscriptionInfo from "@/components/school-setup/SubscriptionInfo";
import LicenseManager from "@/components/school-setup/LicenseManager";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SchoolSetup = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error("Error fetching user role:", error);
          } else {
            setUserRole(data?.role || null);
          }
        } catch (err) {
          console.error("Error in fetchUserRole:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchUserRole();
  }, [user]);

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

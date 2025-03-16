
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import MobileNavbar from '@/components/Navbar';
import Sidebar from './Sidebar';
import { supabase, fetchUserSchoolInfo } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MainLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  useEffect(() => {
    const checkSchoolAssociation = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/auth');
          return;
        }
        
        // First get the user's school_id
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('school_id, role')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          setError("Failed to load user profile. Please try again.");
          setLoading(false);
          return;
        }
        
        if (!profileData.school_id) {
          console.log("User has no school_id:", profileData);
          setError("User is not associated with any school");
          setLoading(false);
          return;
        }
        
        // Try to get school info
        try {
          const schoolInfo = await fetchUserSchoolInfo();
          console.log("School info fetched:", schoolInfo);
          setSchoolInfo(schoolInfo);
        } catch (schoolInfoError) {
          console.error("Error fetching school info:", schoolInfoError);
          // We continue even if this fails
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error checking school association:", err);
        setError("Failed to check school association. Please try again.");
        setLoading(false);
      }
    };
    
    checkSchoolAssociation();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        {error === "User is not associated with any school" && (
          <Button onClick={() => navigate('/school-setup')}>
            Set Up Your School
          </Button>
        )}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <MobileNavbar />
          <main className="flex-1 p-4 pt-24 pb-20 lg:pt-24 lg:pb-6 overflow-auto">
            <div className="max-w-7xl mx-auto transition-all duration-300 page-transition">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;

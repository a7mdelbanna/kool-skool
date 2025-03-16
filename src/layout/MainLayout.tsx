
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import MobileNavbar from '@/components/Navbar';
import Sidebar from './Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MainLayout = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }
        
        // Only check school association if not on school setup page
        if (!location.pathname.includes('/school-setup')) {
          // Check if user has a school association
          const { data, error } = await supabase.rpc('get_user_school_info');
          
          // If error isn't "no rows returned" or user has no school
          if ((error && error.code !== 'PGRST116') || (!error && (!data || data.length === 0))) {
            if (location.pathname === '/team-members') {
              // Don't redirect, just let the page handle the no-school state
              console.log('User has no school association, but staying on team members page');
            } else if (!location.pathname.includes('/license-verification')) {
              // Redirect to school setup for other pages
              console.log('User has no school association, redirecting to school setup');
              toast({
                title: "School Setup Required",
                description: "Please set up your school before continuing",
              });
              navigate('/school-setup');
              return;
            }
          }
        }
        
        // Session exists and school check passed if needed, continue rendering
        setLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, location.pathname, toast]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading application...</p>
        </div>
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

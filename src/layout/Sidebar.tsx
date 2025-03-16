
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebarContext } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Settings,
  BarChart3,
  UserPlus,
  LogOut
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const NavItem = ({ to, icon: Icon, label, onClick }: {
  to?: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) => {
  const location = useLocation();
  const isActive = to ? location.pathname === to : false;
  
  const NavItemContent = () => (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-accent"
    )}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </div>
  );
  
  if (to) {
    return (
      <NavLink to={to} className="block">
        <NavItemContent />
      </NavLink>
    );
  }
  
  return (
    <button onClick={onClick} className="block w-full text-left">
      <NavItemContent />
    </button>
  );
};

const Sidebar = () => {
  const { expanded } = useSidebarContext();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
          if (data && !error) {
            setUserRole(data.role);
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };
    
    fetchUserRole();
  }, []);
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  
  const isAdmin = userRole === 'director' || userRole === 'admin';
  
  return (
    <aside className={cn(
      "border-r bg-card h-screen overflow-auto fixed top-0 z-30 transition-all duration-300 lg:relative",
      expanded ? "w-64" : "w-0 -translate-x-full lg:w-20 lg:translate-x-0"
    )}>
      <div className="px-4 py-6">
        <div className="flex items-center justify-center mb-10">
          <h1 className={cn(
            "font-bold text-2xl transition-opacity duration-300",
            expanded ? "opacity-100" : "hidden lg:block lg:opacity-0"
          )}>
            School System
          </h1>
        </div>
        
        <nav className="space-y-2">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/students" icon={Users} label="Students" />
          <NavItem to="/calendar" icon={Calendar} label="Calendar" />
          <NavItem to="/payments" icon={CreditCard} label="Payments" />
          
          {/* Admin and Director-only routes */}
          {isAdmin && (
            <>
              <div className="py-2">
                <div className={cn(
                  "text-xs font-semibold tracking-wider uppercase text-muted-foreground px-3 py-1",
                  expanded ? "block" : "hidden lg:block"
                )}>
                  Administration
                </div>
              </div>
              
              <NavItem to="/reports" icon={BarChart3} label="Reports" />
              <NavItem to="/team-access" icon={UserPlus} label="Team Access" />
              <NavItem to="/settings" icon={Settings} label="Settings" />
            </>
          )}
          
          <div className="py-2 mt-4">
            <div className={cn(
              "border-t border-border",
              expanded ? "block" : "hidden lg:block"
            )} />
          </div>
          
          <NavItem icon={LogOut} label="Logout" onClick={handleLogout} />
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

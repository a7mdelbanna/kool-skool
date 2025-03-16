import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  CalendarRange,
  DollarSign,
  BarChart3,
  Settings,
  Users,
  School2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-secondary">
      <div className="flex-1 flex flex-col py-4">
        <div className="px-3 py-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            <School2 className="inline-block mr-2 h-6 w-6" />
            School CRM
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="outline-none focus:outline-none rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main section */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Menu
          </h2>
          <div className="space-y-1">
            <NavLink to="/">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </NavLink>
            <NavLink to="/students">
              <GraduationCap className="mr-2 h-4 w-4" />
              Students
            </NavLink>
            <NavLink to="/calendar">
              <CalendarRange className="mr-2 h-4 w-4" />
              Calendar
            </NavLink>
            <NavLink to="/payments">
              <DollarSign className="mr-2 h-4 w-4" />
              Payments
            </NavLink>
            <NavLink to="/reports">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </NavLink>
            <NavLink to="/team-members">
              <Users className="mr-2 h-4 w-4" />
              Team Members
            </NavLink>
          </div>
        </div>

        {/* Settings section */}
        <div className="mt-auto px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Settings
          </h2>
          <div className="space-y-1">
            <NavLink to="/school-setup">
              <Settings className="mr-2 h-4 w-4" />
              School Setup
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { NavLink } from "react-router-dom";
import {
  Home,
  Calendar,
  DollarSign,
  Settings,
  Users,
  Key,
  BarChart,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  toggleSidebar: () => void;
  className?: string;
}

const Sidebar = ({ open, toggleSidebar, className }: SidebarProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  const userAvatar = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : 'UU';

  return (
    <Sheet open={open} onOpenChange={toggleSidebar}>
      <SheetTrigger asChild>
        <Menu className="md:hidden h-6 w-6" />
      </SheetTrigger>
      <SheetContent side="left" className={cn("w-full sm:w-64 p-6 flex flex-col gap-4", className)}>
        <SheetHeader className="text-left pb-4 border-b">
          <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
          <SheetDescription>
            Navigate through your school management system
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="Avatar" />
                  <AvatarFallback>{userAvatar}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mr-2">
              <DropdownMenuItem>
                {userName}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
              
              {/* Menu items */}
              <div className="space-y-1">
                {/* Dashboard link */}
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                      {
                        "bg-primary/10 text-primary font-semibold": isActive,
                        "text-foreground/80": !isActive,
                      }
                    )
                  }
                >
                  <Home className="h-5 w-5" />
                  <span>Dashboard</span>
                </NavLink>
                
                {/* Students link */}
                <NavLink
                  to="/students"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                      {
                        "bg-primary/10 text-primary font-semibold": isActive,
                        "text-foreground/80": !isActive,
                      }
                    )
                  }
                >
                  <Users className="h-5 w-5" />
                  <span>Students</span>
                </NavLink>
                
                {/* Courses link */}
                <NavLink
                  to="/courses"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                      {
                        "bg-primary/10 text-primary font-semibold": isActive,
                        "text-foreground/80": !isActive,
                      }
                    )
                  }
                >
                  <BookOpen className="h-5 w-5" />
                  <span>Courses</span>
                </NavLink>
                
                {/* Calendar link */}
                <NavLink
                  to="/calendar"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                      {
                        "bg-primary/10 text-primary font-semibold": isActive,
                        "text-foreground/80": !isActive,
                      }
                    )
                  }
                >
                  <Calendar className="h-5 w-5" />
                  <span>Calendar</span>
                </NavLink>
                
                {/* Payments link */}
                <NavLink
                  to="/payments"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                      {
                        "bg-primary/10 text-primary font-semibold": isActive,
                        "text-foreground/80": !isActive,
                      }
                    )
                  }
                >
                  <DollarSign className="h-5 w-5" />
                  <span>Payments</span>
                </NavLink>
                
                {/* Team Access link */}
                <NavLink
                  to="/team-access"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                      {
                        "bg-primary/10 text-primary font-semibold": isActive,
                        "text-foreground/80": !isActive,
                      }
                    )
                  }
                >
                  <Key className="h-5 w-5" />
                  <span>Team Access</span>
                </NavLink>
                
                {/* Settings link */}
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                      {
                        "bg-primary/10 text-primary font-semibold": isActive,
                        "text-foreground/80": !isActive,
                      }
                    )
                  }
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </NavLink>
                
                {/* Reports link */}
                <NavLink
                  to="/reports"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                      {
                        "bg-primary/10 text-primary font-semibold": isActive,
                        "text-foreground/80": !isActive,
                      }
                    )
                  }
                >
                  <BarChart className="h-5 w-5" />
                  <span>Reports</span>
                </NavLink>
              </div>
              
              <Separator className="my-6" />
              
              <div className="mt-auto pb-4">
                <p className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} School Management System
                </p>
              </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;


import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  ClipboardCheck,
  CreditCard, 
  Settings, 
  Phone, 
  BarChart3,
  UserCog,
  Key,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useContext } from 'react';
import { Separator } from '@/components/ui/separator';
import { UserContext } from '@/App';
import { useToast } from '@/hooks/use-toast';
import UserProfile from '@/components/sidebar/UserProfile';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Finances', href: '/finances', icon: DollarSign },
    { name: 'Contacts', href: '/contacts', icon: Phone },
    { name: 'Reports', href: '/states-reports', icon: BarChart3 },
  ];

  const adminNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Team Access', href: '/team-access', icon: UserCog },
    { name: 'Student Access', href: '/student-access', icon: Shield },
    { name: 'License', href: '/license-management', icon: Key },
  ];

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('user');
    
    // Update authentication context
    setUser(null);
    
    // Show logout notification
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account."
    });
    
    // Trigger storage event to synchronize across tabs
    window.dispatchEvent(new Event('storage'));
    
    // Redirect to login page
    navigate('/login');
  };

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 shadow-sm flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header with Logo */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl text-blue-900">TutorPro</span>
              <p className="text-xs text-blue-600">Management System</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm mx-auto">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 hover:bg-blue-100"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-blue-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-blue-600" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 bg-gray-50/50">
        {/* Main Navigation */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
              Main
            </p>
          )}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0")} />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </div>
        
        <Separator className="my-4 bg-gray-200" />
        
        {/* Admin Navigation */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
              Admin
            </p>
          )}
          {adminNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0")} />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </div>

        <Separator className="my-4 bg-gray-200" />

        {/* User Profile Section - Now positioned after Admin section */}
        <div className="space-y-1">
          <UserProfile isCollapsed={isCollapsed} onLogout={handleLogout} />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {!isCollapsed && (
          <div className="text-xs text-gray-500 text-center">
            © 2024 TutorPro
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

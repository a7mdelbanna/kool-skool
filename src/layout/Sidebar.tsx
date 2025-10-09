import React, { useState, useContext, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  ClipboardCheck,
  CheckSquare,
  CreditCard,
  Settings,
  Phone,
  BarChart3,
  UserCog,
  Key,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Shield,
  UsersRound,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  User,
  Briefcase,
  GraduationCap,
  Wallet,
  Bell,
  Database,
  Mic,
  Cake,
  CalendarClock,
  Palette,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserContext } from '@/App';
import { useToast } from '@/hooks/use-toast';
import UserProfile from '@/components/sidebar/UserProfile';
import { schoolLogoService } from '@/services/firebase/schoolLogo.service';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(
    location.pathname.startsWith('/settings')
  );
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);

  // Load school logo on mount
  useEffect(() => {
    if (user?.schoolId) {
      loadSchoolLogo();
    }
  }, [user?.schoolId]);

  const loadSchoolLogo = async () => {
    if (!user?.schoolId) return;

    try {
      const logoUrl = await schoolLogoService.getLogoUrl(user.schoolId, 'icon');
      setSchoolLogo(logoUrl);
    } catch (error) {
      console.error('Error loading school logo:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Actions Hub', href: '/actions-hub', icon: Zap },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Groups', href: '/groups', icon: UsersRound },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Online Booking', href: '/online-booking', icon: CalendarClock },
    { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
    { name: 'TODOs', href: '/todos', icon: CheckSquare },
    { name: 'Speaking Practice', href: '/speaking-topics', icon: Mic },
    { name: 'Birthdays', href: '/birthdays', icon: Cake },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Finances', href: '/finances', icon: DollarSign },
    { name: 'Contacts', href: '/contacts', icon: Phone },
    { name: 'Reports', href: '/states-reports', icon: BarChart3 },
  ];

  const settingsSubItems = [
    { name: 'Personal', href: '/settings/personal', icon: User },
    { name: 'Theme', href: '/settings/theme', icon: Palette },
    { name: 'School', href: '/settings/school', icon: Briefcase },
    { name: 'Academic', href: '/settings/academic', icon: GraduationCap },
    { name: 'Financial', href: '/settings/financial', icon: Wallet },
    { name: 'Notifications', href: '/settings/notifications', icon: Bell },
    { name: 'Communications', href: '/settings/communications', icon: MessageSquare },
    { name: 'Data Management', href: '/settings/data-management', icon: Database },
  ];

  const adminNavigation = [
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      hasSubItems: true,
      subItems: settingsSubItems,
      expanded: settingsExpanded
    },
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

  const renderNavItem = (item: any, isActive: boolean) => {
    const itemContent = (
      <>
        {/* Active Background Indicator */}
        {isActive && (
          <div className={cn(
            "absolute inset-0 bg-primary rounded-lg",
            isCollapsed && "rounded-xl"
          )} />
        )}

        {/* Icon Container */}
        <div className={cn(
          "relative z-10 flex items-center justify-center",
          isCollapsed && "w-full"
        )}>
          <item.icon className={cn(
            "flex-shrink-0",
            isCollapsed ? "h-5 w-5" : "h-5 w-5",
            isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
          )} />
        </div>

        {/* Item Label */}
        {!isCollapsed && (
          <span className={cn(
            "relative z-10 font-medium",
            isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
          )}>
            {item.name}
          </span>
        )}

        {/* Active Indicator Bar - Only in expanded mode */}
        {isActive && !isCollapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}
      </>
    );

    const classNames = cn(
      "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 relative group",
      isActive
        ? "shadow-md"
        : "hover:bg-white/5",
      isCollapsed ? "justify-center p-3" : "px-3 py-2.5"
    );

    return isCollapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink to={item.href} className={classNames}>
            {itemContent}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
          {item.name}
        </TooltipContent>
      </Tooltip>
    ) : (
      <NavLink to={item.href} className={classNames}>
        {itemContent}
      </NavLink>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "bg-sidebar-background/95 backdrop-blur-xl border-r border-sidebar-border flex flex-col transition-all duration-300 relative h-screen",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {/* Subtle Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] via-transparent to-blue-500/[0.03] pointer-events-none" />

        {/* Header with Logo - Fixed */}
        <div className={cn(
          "border-b border-sidebar-border/50 flex items-center justify-between relative z-10 flex-shrink-0",
          isCollapsed ? "p-3" : "p-4"
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                {schoolLogo ? (
                  <img
                    src={schoolLogo}
                    alt="School Logo"
                    className="h-7 w-7 object-contain"
                  />
                ) : (
                  <BookOpen className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <span className="font-bold text-lg text-foreground">Kool-Skool</span>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                {schoolLogo ? (
                  <img
                    src={schoolLogo}
                    alt="School Logo"
                    className="h-7 w-7 object-contain"
                  />
                ) : (
                  <BookOpen className="h-6 w-6 text-primary" />
                )}
              </div>
            </div>
          )}

          {/* Toggle Button - Only show in expanded mode */}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Expand Button for Collapsed State */}
        {isCollapsed && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              className="h-8 w-8 hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation - Scrollable */}
        <nav className={cn(
          "flex-1 space-y-2 relative z-10 overflow-y-auto",
          isCollapsed ? "px-3 py-2" : "p-4"
        )}>
          {/* Main Navigation */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                MAIN
              </p>
            )}
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <div key={item.name}>
                  {renderNavItem(item, isActive)}
                </div>
              );
            })}
          </div>

          <Separator className="my-4 bg-white/10" />

          {/* Admin Navigation */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                ADMIN
              </p>
            )}
            {adminNavigation.map((item) => {
              const isActive = item.hasSubItems
                ? item.subItems?.some(subItem => location.pathname === subItem.href)
                : location.pathname === item.href;

              return (
                <div key={item.name}>
                  {/* Main Navigation Item */}
                  {item.hasSubItems ? (
                    isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigate('/settings/personal')}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                              isActive ? "shadow-md" : "hover:bg-white/5",
                              "justify-center p-3"
                            )}
                          >
                            {isActive && (
                              <div className="absolute inset-0 bg-primary rounded-xl" />
                            )}
                            <div className="relative z-10 flex items-center justify-center w-full">
                              <item.icon className={cn(
                                "flex-shrink-0 h-5 w-5",
                                isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                              )} />
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        onClick={() => setSettingsExpanded(!settingsExpanded)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                          isActive ? "shadow-md" : "hover:bg-white/5",
                          "px-3 py-2.5"
                        )}
                      >
                        {isActive && (
                          <div className="absolute inset-0 bg-primary rounded-lg" />
                        )}
                        <item.icon className={cn(
                          "flex-shrink-0 h-5 w-5 relative z-10",
                          isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                        )} />
                        <span className={cn(
                          "flex-1 text-left relative z-10",
                          isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                        )}>
                          {item.name}
                        </span>
                        {settingsExpanded ? (
                          <ChevronUp className={cn(
                            "h-4 w-4 relative z-10",
                            isActive ? "text-white" : "text-gray-400"
                          )} />
                        ) : (
                          <ChevronDown className={cn(
                            "h-4 w-4 relative z-10",
                            isActive ? "text-white" : "text-gray-400"
                          )} />
                        )}
                      </button>
                    )
                  ) : (
                    renderNavItem(item, isActive)
                  )}

                  {/* Sub Items */}
                  {item.hasSubItems && settingsExpanded && !isCollapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems?.map((subItem) => {
                        const isSubActive = location.pathname === subItem.href;
                        return (
                          <NavLink
                            key={subItem.name}
                            to={subItem.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                              isSubActive
                                ? "bg-primary/80 text-white"
                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            <span>{subItem.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer - User Profile - Fixed */}
        <div className={cn(
          "border-t border-sidebar-border/50 relative z-10 flex-shrink-0",
          isCollapsed ? "p-3" : "p-4"
        )}>
          <UserProfile
            isCollapsed={isCollapsed}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
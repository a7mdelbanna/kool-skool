import React, { useState, useContext } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Brain,
  TrendingUp,
  FolderOpen,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trophy,
  Zap,
  Flame,
  Bell,
  Moon,
  Sun,
  User,
  Star,
  Target,
  Headphones,
  Video,
  FileText,
  Heart,
  Mail,
  Globe,
  MapPin,
  GraduationCap,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserContext } from '@/App';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/providers/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StudentSidebarProps {
  studentData?: any;
  stats?: {
    streak: number;
    xp: number;
    level: number;
    nextLevelXp: number;
    completedLessons: number;
    badges: number;
  };
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ studentData, stats }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(3);

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/student-dashboard', 
      icon: LayoutDashboard,
      badge: null 
    },
    { 
      name: 'My Subscriptions', 
      href: '/student-dashboard/subscriptions', 
      icon: Calendar,
      badge: 'Active' 
    },
    { 
      name: 'My Learning', 
      href: '/student-dashboard/learning', 
      icon: BookOpen,
      badge: 'New' 
    },
    { 
      name: 'Practice Center', 
      href: '/student-dashboard/practice', 
      icon: Brain,
      badge: null 
    },
    { 
      name: 'My Progress', 
      href: '/student-dashboard/progress', 
      icon: TrendingUp,
      badge: null 
    },
    { 
      name: 'Resources', 
      href: '/student-dashboard/resources', 
      icon: FolderOpen,
      badge: '5' 
    },
    { 
      name: 'Messages', 
      href: '/student-dashboard/messages', 
      icon: MessageSquare,
      badge: '2' 
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/student-login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const xpProgress = stats ? (stats.xp / stats.nextLevelXp) * 100 : 0;

  // Handle both camelCase and snake_case naming
  const firstName = studentData?.first_name || studentData?.firstName || '';
  const lastName = studentData?.last_name || studentData?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Student';
  const initials = (firstName[0]?.toUpperCase() || 'S') + (lastName[0]?.toUpperCase() || 'T');

  return (
    <motion.div 
      className={cn(
        "relative flex flex-col h-screen transition-all duration-300",
        "bg-gradient-to-b from-slate-50 via-white to-slate-50/80",
        "dark:from-slate-900 dark:via-gray-900 dark:to-black/90",
        "border-r border-slate-200 dark:border-slate-800",
        isCollapsed ? "w-24" : "w-80"
      )}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-20 z-50 rounded-full bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-700 dark:text-slate-300" /> : <ChevronLeft className="h-4 w-4 text-slate-700 dark:text-slate-300" />}
      </Button>

      {/* Header Section */}
      <div className="p-6 space-y-4">
        {/* Logo/Brand */}
        <div className="flex items-center justify-center mb-2">
          <motion.div 
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-md opacity-75 dark:opacity-50"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2 shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TutorFlow
              </span>
            )}
          </motion.div>
        </div>

        {/* Enhanced Student Profile Widget */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 dark:from-slate-800 dark:via-slate-900 dark:to-black rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
              
              {/* Profile Header with Actions */}
              <div className="relative p-5 pb-3">
                <div className="absolute top-3 right-3 flex items-center space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleTheme} 
                    className="h-8 w-8 hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-slate-400 hover:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => navigate('/student-dashboard/settings')}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <User className="h-4 w-4 mr-2" />
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex flex-col items-center space-y-3">
                  {/* Avatar with Status */}
                  <div className="relative">
                    <Avatar className="h-20 w-20 ring-4 ring-white/10 shadow-2xl">
                      <AvatarImage src={studentData?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xl">
                        {initials || 'ST'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-1.5 shadow-lg">
                      <div className="h-3 w-3 bg-white rounded-full" />
                    </div>
                  </div>
                  
                  {/* Name and Role */}
                  <div className="text-center">
                    <h3 className="font-bold text-lg text-white">
                      {fullName}
                    </h3>
                    <p className="text-xs text-slate-400">Active Student</p>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border-blue-500/30">
                      <Zap className="h-3 w-3 mr-1" />
                      Level {stats?.level || 1}
                    </Badge>
                    <Badge className="bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/30">
                      <Flame className="h-3 w-3 mr-1" />
                      {stats?.streak || 0} days
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Profile Details */}
              <div className="px-5 pb-4 space-y-3 border-t border-slate-700/50 pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-slate-400">
                    <Mail className="h-4 w-4 mr-2 text-slate-500" />
                    <span className="truncate">{studentData?.email || 'student@tutorflow.com'}</span>
                  </div>
                  <div className="flex items-center text-slate-400">
                    <Globe className="h-4 w-4 mr-2 text-slate-500" />
                    <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                  </div>
                  <div className="flex items-center text-slate-400">
                    <MapPin className="h-4 w-4 mr-2 text-slate-500" />
                    <span>{studentData?.location || 'United States'}</span>
                  </div>
                </div>
              </div>

              {/* XP Progress Section */}
              <div className="px-5 pb-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Progress to Level {(stats?.level || 1) + 1}</span>
                    <span className="text-slate-300 font-medium">{stats?.xp || 0}/{stats?.nextLevelXp || 100} XP</span>
                  </div>
                  <Progress value={xpProgress} className="h-2 bg-slate-700/50">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-sm"
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </Progress>
                </div>
                
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center p-2 rounded-lg bg-slate-800/50">
                    <Trophy className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                    <p className="text-sm font-bold text-white">{stats?.badges || 0}</p>
                    <p className="text-xs text-slate-500">Badges</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-800/50">
                    <Target className="h-4 w-4 mx-auto text-green-500 mb-1" />
                    <p className="text-sm font-bold text-white">{stats?.completedLessons || 0}</p>
                    <p className="text-xs text-slate-500">Lessons</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-800/50">
                    <Star className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                    <p className="text-sm font-bold text-white">4.8</p>
                    <p className="text-xs text-slate-500">Rating</p>
                  </div>
                </div>
              </div>
              
              {/* Notification Badge Overlay */}
              {notifications > 0 && (
                <div className="absolute top-5 left-5">
                  <div className="relative">
                    <Bell className="h-5 w-5 text-slate-400" />
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold shadow-lg"
                    >
                      {notifications}
                    </motion.span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      {/* Navigation */}
      <nav className="flex-1 px-6 py-4 space-y-2 overflow-y-auto">
        {navigation.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <NavLink
                to={item.href}
                className={cn(
                  "group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all",
                  isActive 
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-600/30 dark:to-purple-600/30 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "p-1.5 rounded-md transition-all",
                    isActive && "bg-gradient-to-r from-blue-500/20 to-purple-500/20"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4 transition-all",
                      isActive && "text-blue-600 dark:text-blue-400"
                    )} />
                  </div>
                  {!isCollapsed && (
                    <span>{item.name}</span>
                  )}
                </div>
                {!isCollapsed && item.badge && (
                  <Badge 
                    variant={item.badge === 'New' ? 'default' : 'secondary'} 
                    className="ml-auto text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      {/* Footer - Simplified */}
      {!isCollapsed && (
        <div className="p-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Made with <Heart className="inline h-3 w-3 text-red-500" /> by TutorFlow
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">v2.0.0</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StudentSidebar;
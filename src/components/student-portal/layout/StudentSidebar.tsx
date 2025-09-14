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
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserContext } from '@/App';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';

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
  const initials = studentData?.first_name?.[0]?.toUpperCase() + studentData?.last_name?.[0]?.toUpperCase();

  return (
    <motion.div 
      className={cn(
        "relative flex flex-col h-screen bg-gradient-to-b from-background to-muted/20 border-r transition-all duration-300",
        isCollapsed ? "w-20" : "w-72"
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
        className="absolute -right-4 top-20 z-50 rounded-full bg-background shadow-md hover:shadow-lg transition-all"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Header Section */}
      <div className="p-6 space-y-4">
        {/* Logo/Brand */}
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-md opacity-75"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TutorFlow
              </span>
            )}
          </motion.div>
          
          {/* Theme Toggle & Notifications */}
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="relative">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Student Profile Card */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 space-y-3"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12 ring-2 ring-blue-500/20">
                  <AvatarImage src={studentData?.avatar} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    {initials || 'ST'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {studentData?.first_name} {studentData?.last_name}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      Level {stats?.level || 1}
                    </Badge>
                    <div className="flex items-center text-orange-500">
                      <Flame className="h-3 w-3 mr-1" />
                      <span className="text-xs font-bold">{stats?.streak || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                    {stats?.xp || 0} XP
                  </span>
                  <span>{stats?.nextLevelXp || 100} XP</span>
                </div>
                <Progress value={xpProgress} className="h-2 bg-blue-100 dark:bg-blue-900">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all" />
                </Progress>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center">
                  <Trophy className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                  <p className="text-xs font-semibold">{stats?.badges || 0}</p>
                  <p className="text-xs text-muted-foreground">Badges</p>
                </div>
                <div className="text-center">
                  <Target className="h-4 w-4 mx-auto text-green-500 mb-1" />
                  <p className="text-xs font-semibold">{stats?.completedLessons || 0}</p>
                  <p className="text-xs text-muted-foreground">Lessons</p>
                </div>
                <div className="text-center">
                  <Star className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                  <p className="text-xs font-semibold">4.8</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
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
                  "group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                  isActive 
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-600 dark:text-blue-400" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
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

      <Separator />

      {/* Footer Actions */}
      <div className="p-4 space-y-2">
        <NavLink
          to="/student-dashboard/settings"
          className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4" />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>
        
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-3" />
          {!isCollapsed && <span>Logout</span>}
        </Button>

        {/* App Version */}
        {!isCollapsed && (
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              Made with <Heart className="inline h-3 w-3 text-red-500" /> by TutorFlow
            </p>
            <p className="text-xs text-muted-foreground">v2.0.0</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StudentSidebar;
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { UserContext } from '@/App';
import { Search, Command, Sparkles, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { useAttendanceData } from '@/hooks/useAttendanceData';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  color: string;
}

const EnhancedDashboardHeader: React.FC = () => {
  const { user } = useContext(UserContext);
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');

  // Fetch attendance data to get today's sessions
  const { sessions, loading: sessionsLoading, loadSessions } = useAttendanceData(user?.timezone);

  // Calculate today's sessions count
  const todaysSessionsCount = useMemo(() => {
    if (!sessions || sessions.length === 0) return 0;

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    return sessions.filter(session =>
      isWithinInterval(new Date(session.date), { start: todayStart, end: todayEnd }) &&
      session.status !== 'cancelled'
    ).length;
  }, [sessions]);

  useEffect(() => {
    // Load sessions when component mounts
    if (user?.schoolId) {
      loadSessions();
    }
  }, [user?.schoolId]);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let tod = '';
      let greet = '';

      if (hour < 12) {
        tod = 'morning';
        greet = 'Good morning';
      } else if (hour < 17) {
        tod = 'afternoon';
        greet = 'Good afternoon';
      } else {
        tod = 'evening';
        greet = 'Good evening';
      }

      setTimeOfDay(tod);
      setGreeting(greet);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const openGlobalSearch = () => {
    const event = new CustomEvent('openGlobalSearch');
    window.dispatchEvent(event);
  };

  const quickStats: QuickStat[] = [
    {
      label: "Today's Revenue",
      value: '$0',
      icon: DollarSign,
      trend: 0,
      color: 'text-green-500'
    },
    {
      label: 'Active Students',
      value: 16,
      icon: Users,
      trend: 2,
      color: 'text-blue-500'
    },
    {
      label: sessionsLoading ? "Loading..." : "Today's Sessions",
      value: todaysSessionsCount,
      icon: Calendar,
      trend: 0,
      color: 'text-purple-500'
    },
    {
      label: 'This Month',
      value: '₱131,312',
      icon: TrendingUp,
      trend: 15,
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="relative w-full">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

      {/* Content */}
      <div className="relative px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            {greeting}, {user?.firstName || 'there'}!
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {timeOfDay === 'morning' && "Start your day with a quick overview of your tutoring business"}
            {timeOfDay === 'afternoon' && "Keep the momentum going with your tutoring sessions"}
            {timeOfDay === 'evening' && "Wrap up your day and plan for tomorrow's success"}
          </p>
        </div>

        {/* Enhanced Search Bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-300" />

            {/* Search Input */}
            <button
              onClick={openGlobalSearch}
              className={cn(
                "relative w-full flex items-center gap-3 px-6 py-4",
                "bg-background/60 backdrop-blur-xl",
                "border-2 border-white/10 hover:border-primary/30",
                "rounded-2xl shadow-lg hover:shadow-xl",
                "transition-all duration-300",
                "group-hover:scale-[1.02]",
                "text-left"
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Search className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1">
                <div className="text-base text-foreground/60 group-hover:text-foreground/80 transition-colors">
                  Search students, lessons, payments, or actions...
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Try: "overdue payments" or "today's lessons"
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                  <kbd className="text-xs font-mono">⌘K</kbd>
                  <span className="text-xs text-muted-foreground">to open</span>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Command className="h-4 w-4 text-primary" />
                </div>
              </div>
            </button>
          </div>

          {/* Search Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span className="text-xs text-muted-foreground">Popular:</span>
            {['New Student', 'Schedule Lesson', 'Record Payment', 'View Reports'].map((suggestion) => (
              <Button
                key={suggestion}
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs rounded-full border border-white/10 hover:border-primary/30"
                onClick={openGlobalSearch}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className={cn(
                  "relative overflow-hidden group",
                  "bg-background/40 backdrop-blur-sm",
                  "border-white/10 hover:border-white/20",
                  "transition-all duration-300 hover:scale-[1.02]",
                  "cursor-pointer"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {stat.trend !== 0 && (
                      <span className={cn(
                        "text-xs font-medium",
                        stat.trend > 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {stat.trend > 0 ? '+' : ''}{stat.trend}%
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboardHeader;
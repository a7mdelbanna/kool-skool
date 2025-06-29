import React, { useState, useEffect, useContext } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Search,
  AlertCircle
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EnhancedUpcomingLessonsList from '@/components/calendar/EnhancedUpcomingLessonsList';
import SessionSkeleton from '@/components/calendar/SessionSkeleton';
import { useAttendanceData } from '@/hooks/useAttendanceData';
import { UserContext } from '@/App';

type ViewMode = 'day' | 'week' | 'month';

const Attendance = () => {
  const { user } = useContext(UserContext);
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 0 }));
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const {
    sessions,
    subscriptionInfoMap,
    studentInfoMap,
    loading,
    error,
    loadSessions,
    refreshSessions,
    updateSessionOptimistically,
    revertSessionUpdate
  } = useAttendanceData(user?.timezone);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const goToPreviousPeriod = () => {
    if (viewMode === 'day') {
      setCurrentDate(prev => addDays(prev, -1));
    } else if (viewMode === 'week') {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const goToNextPeriod = () => {
    if (viewMode === 'day') {
      setCurrentDate(prev => addDays(prev, 1));
    } else if (viewMode === 'week') {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(today);
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value as ViewMode);
  };

  const getViewTitle = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else if (viewMode === 'week') {
      const weekEnd = addDays(currentWeekStart, 6);
      const sameMonth = currentWeekStart.getMonth() === weekEnd.getMonth();
      
      if (sameMonth) {
        return `${format(currentWeekStart, 'MMMM d')} - ${format(weekEnd, 'd, yyyy')}`;
      } else {
        return `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      }
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  const getFilteredSessions = () => {
    let filtered = sessions.filter(session => {
      if (!searchQuery) return true;
      return session.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             session.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (viewMode === 'day') {
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.date);
        const currentDateStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const currentDateEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
        return sessionDate >= currentDateStart && sessionDate < currentDateEnd;
      });
    } else if (viewMode === 'week') {
      const weekEnd = addDays(currentWeekStart, 6);
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.date);
        return isWithinInterval(sessionDate, { start: currentWeekStart, end: weekEnd });
      });
    } else if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.date);
        return isWithinInterval(sessionDate, { start: monthStart, end: monthEnd });
      });
    }

    return filtered;
  };

  const filteredSessions = getFilteredSessions();

  const renderSkeletonLoader = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
      
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <SessionSkeleton key={i} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage session attendance
            {user?.timezone && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Viewing in: {user.timezone}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              className="pl-9 w-full md:w-[200px] rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={goToToday} variant="outline" className="gap-2 rounded-lg">
            <CalendarIcon className="h-4 w-4" />
            <span>Today</span>
          </Button>
          <div className="flex rounded-lg shadow-sm">
            <Button onClick={goToPreviousPeriod} variant="outline" size="icon" className="rounded-l-lg rounded-r-none">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={goToNextPeriod} variant="outline" size="icon" className="rounded-r-lg rounded-l-none">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-center text-xl font-medium">
          {getViewTitle()}
        </div>
        
        <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && handleViewModeChange(value)}
            className="justify-start"
          >
            <ToggleGroupItem value="day">Day</ToggleGroupItem>
            <ToggleGroupItem value="week">Week</ToggleGroupItem>
            <ToggleGroupItem value="month">Month</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}. <Button variant="link" onClick={refreshSessions} className="p-0 h-auto">Try again</Button>
            </AlertDescription>
          </Alert>
        ) : loading ? (
          renderSkeletonLoader()
        ) : (
          <EnhancedUpcomingLessonsList 
            sessions={filteredSessions}
            onSessionUpdate={refreshSessions}
            onOptimisticUpdate={updateSessionOptimistically}
            onRevertUpdate={revertSessionUpdate}
            viewMode={viewMode}
            currentDate={currentDate}
            currentWeekStart={currentWeekStart}
            subscriptionInfoMap={subscriptionInfoMap}
            studentInfoMap={studentInfoMap}
          />
        )}
      </div>
    </div>
  );
};

export default Attendance;


import React, { useState, useEffect, useContext } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Plus,
  LayoutGrid,
  List
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, addMonths, subMonths, isSameDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import UpcomingLessonsList from '@/components/calendar/UpcomingLessonsList';
import CalendarView from '@/components/calendar/CalendarView';
import { usePayments } from '@/contexts/PaymentContext';
import NewLessonDialog from '@/components/calendar/NewLessonDialog';
import LessonDetailsDialog from '@/components/calendar/LessonDetailsDialog';
import { Session } from '@/contexts/PaymentContext';
import { useAttendanceData } from '@/hooks/useAttendanceData';
import { UserContext } from '@/App';

type ViewMode = 'day' | 'week' | 'month';
type DisplayMode = 'calendar' | 'list';

const Calendar = () => {
  const { user } = useContext(UserContext);
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 0 }));
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('calendar');
  const [newLessonDialogOpen, setNewLessonDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

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

  const handleLessonClick = (session: Session) => {
    setSelectedSession(session);
    setDetailsDialogOpen(true);
  };

  // Handle session updates - reload sessions data
  const handleSessionUpdate = () => {
    refreshSessions();
  };

  // Filter sessions based on view mode and search query
  const getFilteredSessions = () => {
    let filtered = sessions.filter(session => {
      if (!searchQuery) return true;
      return session.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             session.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Apply date filtering based on view mode (sessions are already in user timezone)
    if (viewMode === 'day') {
      filtered = filtered.filter(session => {
        const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
        return isSameDay(sessionDate, currentDate);
      });
    } else if (viewMode === 'week') {
      const weekEnd = addDays(currentWeekStart, 6);
      filtered = filtered.filter(session => {
        const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
        return isWithinInterval(sessionDate, { start: currentWeekStart, end: weekEnd });
      });
    } else if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      filtered = filtered.filter(session => {
        const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
        return isWithinInterval(sessionDate, { start: monthStart, end: monthEnd });
      });
    }

    return filtered;
  };

  const filteredSessions = getFilteredSessions();

  console.log("Sessions available:", sessions.length);
  console.log("Filtered sessions:", filteredSessions.length);
  console.log("Current view mode:", viewMode);
  console.log("Current display mode:", displayMode);
  console.log("Loading:", loading);
  console.log("User timezone:", user?.timezone);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Manage your lessons and schedule
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
          <Button 
            className="gap-2 rounded-lg shadow-md bg-primary hover:bg-primary/90"
            onClick={() => setNewLessonDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>New Lesson</span>
          </Button>
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
          
          <ToggleGroup 
            type="single" 
            value={displayMode}
            onValueChange={(value) => value && setDisplayMode(value as DisplayMode)}
            className="justify-start"
          >
            <ToggleGroupItem value="calendar" className="gap-1">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" className="gap-1">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading sessions...</div>
          </div>
        ) : displayMode === 'list' ? (
          <UpcomingLessonsList 
            sessions={filteredSessions}
            onLessonClick={handleLessonClick}
            onSessionUpdate={handleSessionUpdate}
            onOptimisticUpdate={updateSessionOptimistically}
            onRevertUpdate={revertSessionUpdate}
            viewMode={viewMode}
            currentDate={currentDate}
            currentWeekStart={currentWeekStart}
            subscriptionInfoMap={subscriptionInfoMap}
            studentInfoMap={studentInfoMap}
          />
        ) : (
          <CalendarView 
            viewMode={viewMode} 
            currentDate={currentDate}
            currentWeekStart={currentWeekStart}
            sessions={filteredSessions}
            onLessonClick={handleLessonClick}
          />
        )}
      </div>

      <NewLessonDialog 
        open={newLessonDialogOpen} 
        onOpenChange={setNewLessonDialogOpen} 
        initialDate={currentDate}
      />

      {selectedSession && (
        <LessonDetailsDialog 
          session={selectedSession} 
          open={detailsDialogOpen} 
          onOpenChange={setDetailsDialogOpen}
          onSessionUpdate={handleSessionUpdate}
        />
      )}
    </div>
  );
};

export default Calendar;

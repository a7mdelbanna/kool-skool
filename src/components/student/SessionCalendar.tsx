import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Download,
  Video,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isFuture, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import CancellationModal from './CancellationModal';

interface Session {
  id: string;
  scheduled_date: string;
  scheduled_time?: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'absent';
  payment_status?: string;
  notes?: string;
  cost: number;
  session_number?: number;
  total_sessions?: number;
  teacher_name?: string;
  course_name?: string;
  location?: string;
}

interface SessionCalendarProps {
  studentId: string;
  sessions: Session[];
  schoolSettings?: {
    allow_student_cancellation: boolean;
    cancellation_notice_hours: number;
    enable_google_calendar: boolean;
  };
  onRefresh?: () => void;
}

const SessionCalendar: React.FC<SessionCalendarProps> = ({
  studentId,
  sessions = [],
  schoolSettings = {
    allow_student_cancellation: true,
    cancellation_notice_hours: 24,
    enable_google_calendar: true
  },
  onRefresh
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const dateKey = format(new Date(session.scheduled_date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  const upcomingSessions = sessions
    .filter(s => s.status === 'scheduled' && isFuture(new Date(s.scheduled_date)))
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 5);

  const pastSessions = sessions
    .filter(s => isPast(new Date(s.scheduled_date)) || s.status !== 'scheduled')
    .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'absent':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3" />;
      case 'absent':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const addToGoogleCalendar = async (session: Session) => {
    if (!schoolSettings.enable_google_calendar) {
      toast.error('Google Calendar integration is not enabled for your school');
      return;
    }

    try {
      setLoading(true);

      // Get calendar event data from backend
      const { data, error } = await supabase.rpc('get_session_calendar_event', {
        p_session_id: session.id
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to get calendar event data');
      }

      const event = data.event;
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);

      // Format dates for Google Calendar
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
      };

      // Build Google Calendar URL
      const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
      googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
      googleCalendarUrl.searchParams.append('text', event.title);
      googleCalendarUrl.searchParams.append('dates', `${formatDate(startDate)}/${formatDate(endDate)}`);
      googleCalendarUrl.searchParams.append('details', event.description);
      googleCalendarUrl.searchParams.append('location', event.location || 'Online');

      // Open Google Calendar in new tab
      window.open(googleCalendarUrl.toString(), '_blank');

      toast.success('Opening Google Calendar...');
    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast.error('Failed to add to Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const downloadICS = (session: Session) => {
    try {
      const startDate = new Date(session.scheduled_date);
      const endDate = new Date(startDate.getTime() + session.duration_minutes * 60000);

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Kool-Skool//Student Portal//EN
BEGIN:VEVENT
UID:${session.id}@kool-skool.com
DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, '')}
DTSTART:${startDate.toISOString().replace(/-|:|\.\d\d\d/g, '')}
DTEND:${endDate.toISOString().replace(/-|:|\.\d\d\d/g, '')}
SUMMARY:${session.course_name || 'Lesson'} Session
DESCRIPTION:Teacher: ${session.teacher_name || 'TBD'}\\n${session.notes || ''}
LOCATION:${session.location || 'Online'}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${session.id}.ics`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Calendar file downloaded');
    } catch (error) {
      console.error('Error downloading ICS:', error);
      toast.error('Failed to download calendar file');
    }
  };

  const renderCalendarDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const daySessions = sessionsByDate[dateKey] || [];
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isCurrentDay = isToday(day);

    return (
      <div
        key={dateKey}
        className={cn(
          "min-h-[80px] p-2 border rounded-lg transition-colors",
          !isCurrentMonth && "opacity-40 bg-muted/20",
          isCurrentDay && "bg-blue-50 border-blue-300",
          daySessions.length > 0 && "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => daySessions.length > 0 && setSelectedSession(daySessions[0])}
      >
        <div className="font-medium text-sm mb-1">
          {format(day, 'd')}
        </div>
        {daySessions.slice(0, 2).map((session, idx) => (
          <div
            key={session.id}
            className={cn(
              "text-xs px-1 py-0.5 rounded mb-1 truncate",
              getStatusColor(session.status)
            )}
          >
            {format(new Date(session.scheduled_date), 'HH:mm')}
          </div>
        ))}
        {daySessions.length > 2 && (
          <div className="text-xs text-muted-foreground">
            +{daySessions.length - 2} more
          </div>
        )}
      </div>
    );
  };

  const SessionCard: React.FC<{ session: Session; showActions?: boolean }> = ({ 
    session, 
    showActions = true 
  }) => (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(new Date(session.scheduled_date), 'PPP')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {format(new Date(session.scheduled_date), 'p')} • {session.duration_minutes} min
              </span>
            </div>
            {session.teacher_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {session.teacher_name}
                </span>
              </div>
            )}
          </div>
          <Badge className={cn("gap-1", getStatusColor(session.status))}>
            {getStatusIcon(session.status)}
            {session.status}
          </Badge>
        </div>

        {session.notes && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {session.notes}
            </AlertDescription>
          </Alert>
        )}

        {showActions && session.status === 'scheduled' && isFuture(new Date(session.scheduled_date)) && (
          <div className="flex flex-wrap gap-2">
            {schoolSettings.enable_google_calendar && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => addToGoogleCalendar(session)}
                disabled={loading}
              >
                <CalendarPlus className="h-4 w-4 mr-1" />
                Add to Google Calendar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadICS(session)}
            >
              <Download className="h-4 w-4 mr-1" />
              Download .ics
            </Button>
            {schoolSettings.allow_student_cancellation && (
              <Button
                size="sm"
                variant="outline"
                className="text-orange-600 hover:text-orange-700"
                onClick={() => {
                  setSelectedSession(session);
                  setCancellationModalOpen(true);
                }}
              >
                <Ban className="h-4 w-4 mr-1" />
                Request Change
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Session Calendar</CardTitle>
              <CardDescription>
                View and manage your upcoming sessions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Tabs value={view} onValueChange={(v: 'calendar' | 'list') => setView(v)}>
                <TabsList>
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
              </Tabs>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {view === 'calendar' ? (
        /* Calendar View */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map(day => renderCalendarDay(day))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Sessions
            </h3>
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No upcoming sessions scheduled
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Sessions
            </h3>
            {pastSessions.length > 0 ? (
              pastSessions.map(session => (
                <SessionCard key={session.id} session={session} showActions={false} />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No past sessions
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Selected Session Details Modal */}
      {selectedSession && view === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionCard session={selectedSession} />
          </CardContent>
        </Card>
      )}

      {/* Cancellation Modal */}
      {selectedSession && (
        <CancellationModal
          session={selectedSession}
          open={cancellationModalOpen}
          onOpenChange={setCancellationModalOpen}
          onSuccess={() => {
            toast.success('Request submitted successfully');
            onRefresh?.();
          }}
          schoolSettings={schoolSettings}
        />
      )}
    </div>
  );
};

export default SessionCalendar;
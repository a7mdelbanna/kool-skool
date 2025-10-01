/**
 * PastSessionsWidget - Dashboard component showing past sessions needing action
 *
 * Features:
 * - Fetches past sessions with status='scheduled' (no action taken)
 * - Shows student name, course, date, and time
 * - Quick action icons: Mark Attended, Cancel, Move, Reschedule
 * - Uses hybrid approach: Firebase students + Supabase sessions
 * - Scrollable list with glass-card styling
 */
import React, { useContext, useEffect, useState } from 'react';
import {
  Check,
  X,
  MoveRight,
  Calendar,
  Clock,
  User,
  BookOpen,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import { databaseService } from '@/services/firebase/database.service';
import { getStudentLessonSessions } from '@/integrations/supabase/client';
import { format, isPast, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PastSession {
  id: string;
  studentId: string;
  studentName: string;
  courseName: string;
  date: Date;
  time: string;
  status: string;
}

const PastSessionsWidget: React.FC = () => {
  const { user } = useContext(UserContext);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user?.schoolId) {
      fetchPastSessions();
    }
  }, [user?.schoolId]);

  const fetchPastSessions = async () => {
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      const now = new Date();
      const sessions: PastSession[] = [];

      // Step 1: Get all students from Firebase
      const students = await databaseService.query('students', {
        where: [{ field: 'schoolId', operator: '==', value: user.schoolId }]
      });

      if (!students || students.length === 0) {
        setPastSessions([]);
        return;
      }

      // Step 2: Fetch sessions from Supabase for each student
      const studentIds = students.map((s: any) => s.id);
      const allSessionsData = await Promise.all(
        studentIds.map(async (studentId) => {
          try {
            const studentSessions = await getStudentLessonSessions(studentId);
            return { studentId, sessions: studentSessions || [] };
          } catch (error) {
            console.error(`Failed to fetch sessions for student ${studentId}:`, error);
            return { studentId, sessions: [] };
          }
        })
      );

      // Step 3: Filter for past sessions with status='scheduled' (no action taken)
      allSessionsData.forEach(({ studentId, sessions: studentSessions }) => {
        const student = students.find((s: any) => s.id === studentId);
        if (!student) return;

        const studentName = `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim();
        const courseName = student.courseName || student.course_name || 'Unknown Course';

        studentSessions.forEach((session: any) => {
          // Only include past sessions with status='scheduled'
          if (session.status !== 'scheduled') return;

          let sessionDate: Date;
          let sessionTime: string;

          if (session.scheduled_datetime) {
            sessionDate = new Date(session.scheduled_datetime);
            sessionTime = format(sessionDate, 'HH:mm');
          } else if (session.scheduled_date && session.scheduled_time) {
            const dateStr = session.scheduled_date;
            const timeStr = session.scheduled_time;
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hours, minutes] = timeStr.split(':').map(Number);
            sessionDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
            sessionTime = timeStr;
          } else {
            return; // Skip if no valid date/time
          }

          // Only include past sessions (before now)
          if (sessionDate < now) {
            sessions.push({
              id: session.id,
              studentId: studentId,
              studentName,
              courseName,
              date: sessionDate,
              time: sessionTime,
              status: session.status
            });
          }
        });
      });

      // Sort by date (oldest first - most urgent)
      sessions.sort((a, b) => a.date.getTime() - b.date.getTime());

      setPastSessions(sessions);
      console.log('📅 Past sessions needing action:', sessions.length);
    } catch (error) {
      console.error('Error fetching past sessions:', error);
      toast.error('Failed to load past sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttended = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      const { error } = await supabase
        .from('lesson_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session marked as attended');
      await fetchPastSessions(); // Refresh list
    } catch (error) {
      console.error('Error marking session attended:', error);
      toast.error('Failed to mark session as attended');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      const { error } = await supabase
        .from('lesson_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session cancelled');
      await fetchPastSessions(); // Refresh list
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast.error('Failed to cancel session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMove = (sessionId: string) => {
    toast.info('Move functionality - redirect to attendance page');
    // TODO: Implement move modal or redirect to attendance page with session pre-selected
  };

  const handleReschedule = (sessionId: string) => {
    toast.info('Reschedule functionality - redirect to calendar page');
    // TODO: Implement reschedule modal or redirect to calendar page with session pre-selected
  };

  if (loading) {
    return (
      <Card className="glass-card backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Past Sessions - Action Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card backdrop-blur-xl border-white/10 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-base">Past Sessions - Action Required</span>
          </CardTitle>
          <div className="px-2 py-1 rounded-md bg-white/10 text-xs font-medium">
            {pastSessions.length} sessions
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {pastSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500/50 mb-3" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No past sessions need action</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-3">
              {pastSessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all duration-200",
                    "bg-white/[0.02] border-white/5",
                    "hover:bg-white/[0.05] hover:border-white/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium text-foreground truncate">
                          {session.studentName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">
                          {session.courseName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(session.date, 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{session.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Icons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 hover:bg-green-500/10 hover:text-green-500"
                      onClick={() => handleMarkAttended(session.id)}
                      disabled={actionLoading === session.id}
                      title="Mark Attended"
                    >
                      {actionLoading === session.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => handleCancel(session.id)}
                      disabled={actionLoading === session.id}
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 hover:bg-blue-500/10 hover:text-blue-500"
                      onClick={() => handleMove(session.id)}
                      disabled={actionLoading === session.id}
                      title="Move"
                    >
                      <MoveRight className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 hover:bg-purple-500/10 hover:text-purple-500"
                      onClick={() => handleReschedule(session.id)}
                      disabled={actionLoading === session.id}
                      title="Reschedule"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PastSessionsWidget;

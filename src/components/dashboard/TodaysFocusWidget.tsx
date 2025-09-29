import React, { useContext, useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Video,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Coffee,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import { databaseService } from '@/services/firebase/database.service';
import { format, isToday, isTomorrow, differenceInMinutes, addMinutes } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface TimeSlot {
  id: string;
  time: string;
  endTime: string;
  title: string;
  studentName: string;
  type: 'individual' | 'group';
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'no-show';
  location?: string;
  isOnline: boolean;
  teacherName?: string;
  color: string;
  duration: number;
}

interface DayStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  cancelledSessions: number;
  revenue: number;
  studentsToday: number;
}

const TodaysFocusWidget: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [dayStats, setDayStats] = useState<DayStats>({
    totalSessions: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    cancelledSessions: 0,
    revenue: 0,
    studentsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.schoolId) {
      fetchTodaySchedule();
      // Refresh every 5 minutes
      const interval = setInterval(fetchTodaySchedule, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.schoolId]);

  const fetchTodaySchedule = async () => {
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch today's sessions
      const sessions = await databaseService.query('sessions', {
        where: [{ field: 'schoolId', operator: '==', value: user.schoolId }]
      });

      const todaySessions = sessions?.filter((session: any) => {
        const sessionDate = new Date(session.scheduled_date);
        return sessionDate >= todayStart && sessionDate <= todayEnd;
      }) || [];

      // Sort by time
      todaySessions.sort((a: any, b: any) => {
        return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
      });

      const slots: TimeSlot[] = [];
      const uniqueStudents = new Set<string>();
      let totalRevenue = 0;
      let completed = 0;
      let upcoming = 0;
      let cancelled = 0;

      for (const session of todaySessions) {
        const sessionTime = new Date(session.scheduled_date);
        const endTime = addMinutes(sessionTime, session.duration_minutes || 60);

        // Get student details
        const student = session.student_id
          ? await databaseService.getById('students', session.student_id)
          : null;
        const studentUser = student
          ? await databaseService.getById('users', student.userId || student.user_id)
          : null;
        const studentName = studentUser
          ? `${studentUser.firstName || studentUser.first_name} ${studentUser.lastName || studentUser.last_name}`
          : 'Unknown Student';

        // Get teacher details
        const teacher = session.teacher_id
          ? await databaseService.getById('users', session.teacher_id)
          : null;
        const teacherName = teacher
          ? `${teacher.firstName || teacher.first_name} ${teacher.lastName || teacher.last_name}`
          : undefined;

        // Determine session status
        let status: TimeSlot['status'] = 'upcoming';
        if (session.status === 'cancelled') {
          status = 'cancelled';
          cancelled++;
        } else if (session.status === 'completed') {
          status = 'completed';
          completed++;
        } else if (session.status === 'no_show') {
          status = 'no-show';
        } else if (now >= sessionTime && now <= endTime) {
          status = 'ongoing';
        } else if (now > endTime) {
          status = 'completed';
          completed++;
        } else {
          upcoming++;
        }

        // Track unique students
        if (session.student_id && status !== 'cancelled') {
          uniqueStudents.add(session.student_id);
        }

        // Calculate revenue (if payment is associated)
        if (session.price && status !== 'cancelled') {
          totalRevenue += session.price;
        }

        // Determine color based on status and type
        let color = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        if (status === 'ongoing') {
          color = 'bg-green-500/10 text-green-500 border-green-500/20 animate-pulse';
        } else if (status === 'completed') {
          color = 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        } else if (status === 'cancelled' || status === 'no-show') {
          color = 'bg-red-500/10 text-red-500 border-red-500/20';
        } else if (session.subscription_type === 'group') {
          color = 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        }

        slots.push({
          id: session.id,
          time: format(sessionTime, 'HH:mm'),
          endTime: format(endTime, 'HH:mm'),
          title: session.course_name || 'General Session',
          studentName,
          type: session.subscription_type === 'group' ? 'group' : 'individual',
          status,
          location: session.location,
          isOnline: session.is_online || false,
          teacherName,
          color,
          duration: session.duration_minutes || 60
        });
      }

      setTimeSlots(slots);
      setDayStats({
        totalSessions: todaySessions.length,
        completedSessions: completed,
        upcomingSessions: upcoming,
        cancelledSessions: cancelled,
        revenue: totalRevenue,
        studentsToday: uniqueStudents.size
      });
    } catch (error) {
      console.error('Error fetching today schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTimePosition = () => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const dayMinutes = 24 * 60;
    return (totalMinutes / dayMinutes) * 100;
  };

  const getStatusIcon = (status: TimeSlot['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'cancelled':
      case 'no-show':
        return <XCircle className="h-3 w-3" />;
      case 'ongoing':
        return <Zap className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getNextBreak = () => {
    const now = currentTime;
    const currentSlot = timeSlots.find(slot => {
      const startTime = new Date();
      const [hours, minutes] = slot.time.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes));
      const endTime = new Date();
      const [endHours, endMinutes] = slot.endTime.split(':');
      endTime.setHours(parseInt(endHours), parseInt(endMinutes));
      return now >= startTime && now <= endTime;
    });

    if (!currentSlot) {
      // Find next session
      const nextSession = timeSlots.find(slot => {
        if (slot.status === 'cancelled') return false;
        const startTime = new Date();
        const [hours, minutes] = slot.time.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes));
        return startTime > now;
      });

      if (nextSession) {
        const startTime = new Date();
        const [hours, minutes] = nextSession.time.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes));
        const breakMinutes = differenceInMinutes(startTime, now);
        if (breakMinutes > 15) {
          return `${breakMinutes} min break`;
        }
      }
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="glass-card backdrop-blur-xl border-white/10 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextBreak = getNextBreak();

  return (
    <Card className="glass-card backdrop-blur-xl border-white/10 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <span className="text-base">Today's Focus</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {format(currentTime, 'EEEE, MMM d')}
              </p>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/calendar')}
            className="text-xs"
          >
            View Calendar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {/* Day Statistics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-white/[0.02]">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="text-lg font-bold text-foreground">{dayStats.totalSessions}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/[0.02]">
            <p className="text-xs text-muted-foreground">Students</p>
            <p className="text-lg font-bold text-foreground">{dayStats.studentsToday}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/[0.02]">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-lg font-bold text-foreground">${dayStats.revenue}</p>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Current Time Indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Current Time: {format(currentTime, 'HH:mm')}
            </span>
          </div>
          {nextBreak && (
            <Badge variant="secondary" className="text-xs">
              <Coffee className="h-3 w-3 mr-1" />
              {nextBreak}
            </Badge>
          )}
        </div>

        {/* Schedule Timeline */}
        {timeSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No sessions scheduled</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/calendar')}
              className="mt-2"
            >
              Schedule a session
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[350px] pr-3">
            <div className="space-y-2">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className={cn(
                    "group p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                    slot.color.replace('text-', 'border-'),
                    slot.status === 'ongoing' ? 'scale-[1.02]' : '',
                    "hover:scale-[1.01] hover:shadow-lg"
                  )}
                  onClick={() => navigate('/calendar')}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <Badge
                        variant="outline"
                        className={cn("text-xs px-1.5 py-0.5", slot.color)}
                      >
                        {slot.time}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {slot.duration}min
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {slot.studentName}
                            </p>
                            {getStatusIcon(slot.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {slot.title}
                            {slot.teacherName && ` • ${slot.teacherName}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {slot.type === 'group' && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                <Users className="h-2.5 w-2.5 mr-0.5" />
                                Group
                              </Badge>
                            )}
                            {slot.isOnline ? (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                <Video className="h-2.5 w-2.5 mr-0.5" />
                                Online
                              </Badge>
                            ) : slot.location && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                {slot.location}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
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

export default TodaysFocusWidget;
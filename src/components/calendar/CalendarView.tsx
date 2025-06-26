import React, { useState } from 'react';
import { 
  format, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  getDay,
  addDays
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Session } from '@/contexts/PaymentContext';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  CalendarX, 
  XCircle,
  CalendarDays
} from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const subjectColorMap: Record<string, { bg: string, border: string, text: string }> = {
  'Mathematics': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  'Science': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  'English': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700' },
  'Physics': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  'Chemistry': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
  'Biology': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700' },
  'Geography': { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
  'Literature': { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700' },
  'Computer Science': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
  'default': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' }
};

interface SessionWithSubject extends Session {
  subject: string;
  studentName: string;
}

interface CalendarViewProps {
  viewMode: 'day' | 'week' | 'month';
  currentDate: Date;
  currentWeekStart: Date;
  sessions: Session[];
  onLessonClick: (session: Session) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  viewMode, 
  currentDate, 
  currentWeekStart,
  sessions,
  onLessonClick
}) => {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  console.log("CalendarView rendering with sessions:", sessions.length);
  
  // Process sessions to extract subject and use the real student name from the database
  const processedSessions = sessions.map(session => {
    // Extract subject from notes if available, otherwise default to 'General'
    const subject = session.notes?.includes('Mathematics') ? 'Mathematics' :
                   session.notes?.includes('Science') ? 'Science' :
                   session.notes?.includes('English') ? 'English' :
                   session.notes?.includes('Physics') ? 'Physics' :
                   session.notes?.includes('Chemistry') ? 'Chemistry' :
                   session.notes?.includes('Biology') ? 'Biology' :
                   session.notes?.includes('Geography') ? 'Geography' :
                   session.notes?.includes('Literature') ? 'Literature' :
                   session.notes?.includes('Computer Science') ? 'Computer Science' :
                   'General';
    
    // Use the real student name from the session data
    const studentName = session.studentName || 'Unknown Student';
    
    return { ...session, subject, studentName } as SessionWithSubject;
  });

  const handleSessionClick = (session: Session) => {
    onLessonClick(session);
  };

  const getDateSessions = (date: Date) => {
    return processedSessions.filter(session => {
      const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
      return isSameDay(sessionDate, date);
    });
  };

  const getSubjectColors = (subject: string) => {
    return subjectColorMap[subject] || subjectColorMap.default;
  };

  const renderStatusIcon = (status: Session['status']) => {
    switch(status) {
      case "scheduled":
        return <CalendarDays className="h-3 w-3 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "canceled":
        return <CalendarX className="h-3 w-3 text-orange-500" />;
      case "missed":
        return <XCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return (
      <div className="grid grid-cols-7 gap-1 p-4">
        {/* Header row with day names */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
        
        {/* Calendar grid */}
        {Array.from({ length: Math.ceil((monthDays.length + getDay(monthStart)) / 7) }, (_, weekIndex) => {
          const weekStart = weekIndex * 7;
          const weekDays = Array.from({ length: 7 }, (_, dayIndex) => {
            const dayOffset = weekStart + dayIndex - getDay(monthStart);
            return dayOffset >= 0 && dayOffset < monthDays.length ? monthDays[dayOffset] : null;
          });
          
          return weekDays.map((day, dayIndex) => {
            if (!day) {
              return <div key={`empty-${weekIndex}-${dayIndex}`} className="h-24 p-1"></div>;
            }
            
            const dateSessions = getDateSessions(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "h-24 p-1 border border-border relative cursor-pointer hover:bg-accent/50 transition-colors",
                  isToday && "bg-primary/5 border-primary/20",
                  !isCurrentMonth && "text-muted-foreground bg-muted/20"
                )}
                onClick={() => {
                  if (dateSessions.length === 1) {
                    handleSessionClick(dateSessions[0]);
                  }
                }}
              >
                <div className="flex flex-col h-full">
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday && "text-primary font-bold"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dateSessions.slice(0, 3).map((session) => {
                      const colors = getSubjectColors(session.subject);
                      return (
                        <HoverCard key={session.id} openDelay={300} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <div
                              className={cn(
                                "text-xs p-1 rounded text-white font-medium cursor-pointer hover:opacity-80 truncate",
                                colors.bg.replace('bg-', 'bg-').replace('-100', '-500'),
                                session.status === "canceled" && "opacity-60 line-through"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSessionClick(session);
                              }}
                            >
                              {session.time} {session.studentName}
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 p-3" side="top">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Avatar className={cn("h-8 w-8", colors.border)}>
                                  <AvatarFallback className={cn(colors.bg, colors.text)}>
                                    {session.subject.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="font-medium">{session.studentName}</div>
                                  <div className="text-sm text-muted-foreground">{session.subject}</div>
                                </div>
                                {renderStatusIcon(session.status)}
                              </div>
                              <div className="text-sm space-y-1">
                                <div>Time: {session.time}</div>
                                <div>Duration: {session.duration}</div>
                                {session.sessionNumber && session.totalSessions && (
                                  <div>Session: {session.sessionNumber}/{session.totalSessions}</div>
                                )}
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      );
                    })}
                    
                    {dateSessions.length > 3 && (
                      <div className="text-xs text-muted-foreground font-medium">
                        +{dateSessions.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        }).flat()}
      </div>
    );
  };

  const renderWeekView = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className={cn(
                "text-sm mt-1 rounded-full w-8 h-8 flex items-center justify-center mx-auto",
                isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 mt-2">
          {days.map((day, dayIndex) => {
            const dayStart = new Date(day);
            dayStart.setHours(8, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(20, 0, 0);
            
            const dateSessions = getDateSessions(day)
              .sort((a, b) => {
                const [aHours, aMinutes] = a.time.split(':').map(Number);
                const [bHours, bMinutes] = b.time.split(':').map(Number);
                return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
              });
            
            return (
              <div 
                key={dayIndex} 
                className={cn(
                  "border rounded-md min-h-64 p-2 relative",
                  isSameDay(day, new Date()) && "bg-primary/5 border-primary/20"
                )}
              >
                {dateSessions.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">No sessions</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dateSessions.map((session) => {
                      const colors = getSubjectColors(session.subject);
                      return (
                        <div 
                          key={session.id} 
                          className={cn(
                            "p-2 rounded-md border text-sm cursor-pointer hover:bg-accent/50",
                            colors.border,
                            session.status === "canceled" && "opacity-60"
                          )}
                          onClick={() => handleSessionClick(session)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className={cn("h-6 w-6", colors.border)}>
                              <AvatarFallback className={cn(colors.bg, colors.text)}>
                                {session.subject.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{session.studentName}</div>
                              <div className="text-xs text-muted-foreground flex items-center">
                                {session.time} • {session.duration}
                                {session.sessionNumber && session.totalSessions && (
                                  <Badge variant="outline" className="text-[10px] h-4 ml-1">
                                    {session.sessionNumber}/{session.totalSessions}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center">
                              {renderStatusIcon(session.status)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dateSessions = getDateSessions(currentDate)
      .sort((a, b) => {
        const [aHours, aMinutes] = a.time.split(':').map(Number);
        const [bHours, bMinutes] = b.time.split(':').map(Number);
        return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
      });
    
    const timeSlots = Array.from({ length: 13 }, (_, i) => {
      const hour = i + 8;
      return `${hour}:00${hour < 12 ? 'am' : hour === 12 ? 'pm' : 'pm'}`;
    });
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-[80px_1fr] gap-2">
          {timeSlots.map((timeSlot, index) => {
            const slotSessions = dateSessions.filter(session => {
              const [sessionHour] = session.time.split(':').map(Number);
              return sessionHour === index + 8;
            });
            
            return (
              <React.Fragment key={index}>
                <div className="text-xs text-muted-foreground pt-2">{timeSlot}</div>
                <div className={cn(
                  "border-t border-l min-h-20 rounded-md p-2",
                  slotSessions.length > 0 && "bg-primary/5"
                )}>
                  {slotSessions.map(session => {
                    const colors = getSubjectColors(session.subject);
                    return (
                      <div 
                        key={session.id} 
                        className={cn(
                          "p-2 rounded-md border text-sm cursor-pointer hover:bg-accent/50",
                          colors.border,
                          session.status === "canceled" && "opacity-60"
                        )}
                        onClick={() => handleSessionClick(session)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className={cn("h-8 w-8", colors.border)}>
                            <AvatarFallback className={cn(colors.bg, colors.text)}>
                              {session.subject.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium">{session.studentName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {session.time} • {session.duration}
                              {session.sessionNumber && session.totalSessions && (
                                <Badge variant="outline" className="text-[10px] h-4 ml-1">
                                  {session.sessionNumber}/{session.totalSessions}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            {renderStatusIcon(session.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[600px]">
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
    </div>
  );
};

export default CalendarView;

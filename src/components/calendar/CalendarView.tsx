
import React from 'react';
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
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  viewMode, 
  currentDate, 
  currentWeekStart,
  sessions 
}) => {
  // Add debugging
  console.log("CalendarView rendering with sessions:", sessions.length);
  
  const processedSessions = sessions.map(session => {
    const noteParts = session.notes?.split(' ') || [];
    const subject = noteParts.length > 0 ? noteParts[0] : 'default';
    
    const studentNameMatch = session.notes?.match(/with\s+(.*?)$/);
    const studentName = studentNameMatch ? studentNameMatch[1] : `Student ${session.id.slice(-1)}`;
    
    return { ...session, subject, studentName } as SessionWithSubject;
  });

  const getDateSessions = (date: Date) => {
    return processedSessions.filter(session => {
      // Convert session.date to Date object if it's a string
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

  const renderDayContent = (date: Date) => {
    const dateSessions = getDateSessions(date);
    
    if (dateSessions.length === 0) return null;
    
    return (
      <div className="absolute bottom-1 left-0 right-0 flex justify-center">
        <div className="flex gap-0.5">
          {dateSessions.slice(0, 3).map((session, index) => {
            const colors = getSubjectColors(session.subject);
            return (
              <div 
                key={session.id} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  colors.bg, 
                  colors.border
                )}
              />
            );
          })}
          {dateSessions.length > 3 && (
            <div className="text-[8px] text-muted-foreground ml-0.5">
              +{dateSessions.length - 3}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    
    return (
      <Calendar
        mode="single"
        selected={currentDate}
        onSelect={(date) => {}}
        month={currentDate}
        className="w-full p-4 pointer-events-auto"
        classNames={{
          day_selected: "bg-primary/5 text-primary hover:bg-primary/5 hover:text-primary focus:bg-primary/5 focus:text-primary",
          day_today: "bg-accent text-accent-foreground",
        }}
        components={{
          Day: ({ date, ...props }) => {
            const dateSessions = getDateSessions(date);
            return (
              <HoverCard openDelay={100} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div className={cn(
                    "relative h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                    dateSessions.length > 0 && "cursor-pointer"
                  )}>
                    <div {...props} className="h-9 w-9 p-0 font-normal flex items-center justify-center">
                      {format(date, "d")}
                    </div>
                    {renderDayContent(date)}
                  </div>
                </HoverCardTrigger>
                {dateSessions.length > 0 && (
                  <HoverCardContent className="w-80 p-0">
                    <div className="p-4">
                      <h3 className="font-medium mb-2">{format(date, "EEEE, MMMM d, yyyy")}</h3>
                      <div className="space-y-2">
                        {dateSessions.map(session => {
                          const colors = getSubjectColors(session.subject);
                          return (
                            <div 
                              key={session.id} 
                              className={cn(
                                "p-2 rounded-md border text-sm",
                                colors.border
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className={cn("h-7 w-7", colors.border)}>
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
                    </div>
                  </HoverCardContent>
                )}
              </HoverCard>
            );
          }
        }}
      />
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
                // Extract hours and minutes from time strings and compare
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
                            "p-2 rounded-md border text-sm",
                            colors.border,
                            session.status === "canceled" && "opacity-60"
                          )}
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
        // Extract hours and minutes from time strings and compare
        const [aHours, aMinutes] = a.time.split(':').map(Number);
        const [bHours, bMinutes] = b.time.split(':').map(Number);
        return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
      });
    
    // Create time slots from 8 AM to 8 PM
    const timeSlots = Array.from({ length: 13 }, (_, i) => {
      const hour = i + 8;
      return `${hour}:00${hour < 12 ? 'am' : hour === 12 ? 'pm' : 'pm'}`;
    });
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-[80px_1fr] gap-2">
          {timeSlots.map((timeSlot, index) => {
            // Filter sessions that fall within this hour
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
                          "p-2 rounded-md border text-sm",
                          colors.border,
                          session.status === "canceled" && "opacity-60"
                        )}
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

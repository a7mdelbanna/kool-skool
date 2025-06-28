import React from 'react';
import { 
  format, 
  isSameDay, 
  isPast, 
  isFuture, 
  isToday, 
  addDays,
  startOfMonth,
  endOfMonth,
  isWithinInterval
} from 'date-fns';
import { Session, Subscription } from '@/contexts/PaymentContext';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  CalendarX,
  XCircle,
  CalendarDays,
  BookOpen,
  DollarSign,
  Calendar as CalendarScheduleIcon
} from 'lucide-react';
import FunEmptyState from './FunEmptyState';
import { getStudentSubscriptions } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface UpcomingLessonsListProps {
  sessions: Session[];
  onLessonClick?: (session: Session) => void;
  viewMode: 'day' | 'week' | 'month';
  currentDate: Date;
  currentWeekStart: Date;
}

interface SubscriptionInfo {
  id: string;
  studentId: string;
  sessionCount: number;
  completedSessions: number;
  totalPrice: number;
  currency: string;
  startDate: string;
  endDate: string;
  subscriptionName?: string;
}

const UpcomingLessonsList: React.FC<UpcomingLessonsListProps> = ({ 
  sessions, 
  onLessonClick,
  viewMode,
  currentDate,
  currentWeekStart
}) => {
  const [subscriptionInfoMap, setSubscriptionInfoMap] = useState<Map<string, SubscriptionInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  // Load subscription information for all students
  useEffect(() => {
    const loadSubscriptionInfo = async () => {
      try {
        setLoading(true);
        const uniqueStudentIds = [...new Set(sessions.map(session => session.studentId))];
        const subscriptionMap = new Map<string, SubscriptionInfo>();

        await Promise.all(
          uniqueStudentIds.map(async (studentId) => {
            try {
              const subscriptions = await getStudentSubscriptions(studentId);
              
              // Find the active subscription
              const activeSubscription = subscriptions.find(sub => sub.status === 'active');
              
              if (activeSubscription) {
                // Count completed sessions (attended or cancelled)
                const completedSessions = activeSubscription.sessions_completed || 0;
                
                // Calculate end date if not provided
                let endDate = activeSubscription.end_date;
                if (!endDate && activeSubscription.start_date && activeSubscription.duration_months) {
                  const startDate = new Date(activeSubscription.start_date);
                  const calculatedEndDate = new Date(startDate);
                  calculatedEndDate.setMonth(calculatedEndDate.getMonth() + activeSubscription.duration_months);
                  endDate = calculatedEndDate.toISOString().split('T')[0];
                }

                const subscriptionInfo: SubscriptionInfo = {
                  id: activeSubscription.id,
                  studentId: studentId,
                  sessionCount: activeSubscription.session_count,
                  completedSessions: completedSessions,
                  totalPrice: activeSubscription.total_price,
                  currency: activeSubscription.currency,
                  startDate: activeSubscription.start_date,
                  endDate: endDate || activeSubscription.start_date,
                  subscriptionName: activeSubscription.notes || undefined
                };

                subscriptionMap.set(studentId, subscriptionInfo);
              }
            } catch (error) {
              console.error(`Error loading subscription for student ${studentId}:`, error);
            }
          })
        );

        setSubscriptionInfoMap(subscriptionMap);
      } catch (error) {
        console.error('Error loading subscription information:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sessions.length > 0) {
      loadSubscriptionInfo();
    } else {
      setLoading(false);
    }
  }, [sessions]);

  // Group sessions by date
  const today = new Date();
  const tomorrow = addDays(today, 1);
  
  const upcomingSessions = sessions
    .filter(session => !isPast(new Date(session.date)) || isToday(new Date(session.date)))
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
  const pastSessions = sessions
    .filter(session => isPast(new Date(session.date)) && !isToday(new Date(session.date)))
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
  // Render status icon
  const renderStatusIcon = (status: Session['status']) => {
    switch(status) {
      case "scheduled":
        return <CalendarDays className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "canceled":
        return <CalendarX className="h-4 w-4 text-orange-500" />;
      case "missed":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Handle click on a lesson
  const handleLessonClick = (session: Session) => {
    if (onLessonClick) {
      onLessonClick(session);
    }
  };

  // Extract subject from notes
  const getSubject = (session: Session) => {
    return session.notes?.includes('Mathematics') ? 'Mathematics' :
           session.notes?.includes('Science') ? 'Science' :
           session.notes?.includes('English') ? 'English' :
           session.notes?.includes('Physics') ? 'Physics' :
           session.notes?.includes('Chemistry') ? 'Chemistry' :
           session.notes?.includes('Biology') ? 'Biology' :
           session.notes?.includes('Geography') ? 'Geography' :
           session.notes?.includes('Literature') ? 'Literature' :
           session.notes?.includes('Computer Science') ? 'Computer Science' :
           'General';
  };

  // Check if session is in the past
  const isSessionPast = (session: Session) => {
    const sessionDate = new Date(session.date);
    return isPast(sessionDate) && !isToday(sessionDate);
  };

  // Get title based on view mode
  const getViewTitle = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else if (viewMode === 'week') {
      const weekEnd = addDays(currentWeekStart, 6);
      return `Week of ${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  // Format subscription details for display
  const formatSubscriptionDetails = (subscriptionInfo: SubscriptionInfo) => {
    const progress = `${subscriptionInfo.completedSessions}/${subscriptionInfo.sessionCount}`;
    const totalPrice = `$${subscriptionInfo.totalPrice} ${subscriptionInfo.currency}`;
    const startDate = format(new Date(subscriptionInfo.startDate), 'dd MMM');
    const endDate = format(new Date(subscriptionInfo.endDate), 'dd MMM');
    const dateRange = `${startDate} – ${endDate}`;
    
    const parts = [
      progress,
      subscriptionInfo.subscriptionName ? `Subscription: ${subscriptionInfo.subscriptionName}` : null,
      `${subscriptionInfo.sessionCount} lessons`,
      totalPrice,
      dateRange
    ].filter(Boolean);
    
    return parts.join(' • ');
  };

  // Render sessions for a specific date group
  const renderSessionGroup = (title: string, sessions: Session[], showDateLabels: boolean = true) => {
    if (sessions.length === 0) return null;
    
    return (
      <div className="space-y-3 mb-6">
        <h3 className="text-lg font-medium">{title}</h3>
        <div className="grid gap-3">
          {sessions.map(session => {
            const sessionDate = new Date(session.date);
            const dateLabel = showDateLabels ? (
              isToday(sessionDate) 
                ? 'Today' 
                : isSameDay(sessionDate, tomorrow) 
                  ? 'Tomorrow' 
                  : format(sessionDate, 'EEEE, MMMM d')
            ) : format(sessionDate, 'EEEE, MMMM d');
            
            const subject = getSubject(session);
            const studentName = session.studentName || 'Unknown Student';
            const isPastSession = isSessionPast(session);
            const subscriptionInfo = subscriptionInfoMap.get(session.studentId);
            
            return (
              <div 
                key={session.id} 
                className={`border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors ${
                  isPastSession 
                    ? 'opacity-60 bg-gray-50/50 border-gray-200' 
                    : 'bg-white border-border'
                }`}
                onClick={() => handleLessonClick(session)}
              >
                <div className="flex items-center gap-4">
                  {/* Time Section - Left Side */}
                  <div className="flex-shrink-0 text-center min-w-[80px]">
                    <div className={`text-2xl font-bold ${
                      isPastSession ? 'text-gray-400' : 'text-primary'
                    }`}>
                      {session.time.split(':')[0]}
                    </div>
                    <div className={`text-sm ${
                      isPastSession ? 'text-gray-400' : 'text-muted-foreground'
                    }`}>
                      :{session.time.split(':')[1]}
                    </div>
                    <div className={`text-xs mt-1 ${
                      isPastSession ? 'text-gray-400' : 'text-muted-foreground'
                    }`}>
                      {session.duration}
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className={`w-px h-16 ${
                    isPastSession ? 'bg-gray-200' : 'bg-border'
                  }`}></div>
                  
                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-lg truncate ${
                          isPastSession ? 'text-gray-500' : 'text-foreground'
                        }`}>
                          {studentName}
                        </div>
                        <div className={`text-sm mb-2 ${
                          isPastSession ? 'text-gray-400' : 'text-muted-foreground'
                        }`}>
                          {subject} Lesson
                        </div>
                        <div className={`flex items-center text-sm mb-2 ${
                          isPastSession ? 'text-gray-400' : 'text-muted-foreground'
                        }`}>
                          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                          {dateLabel}
                        </div>
                        
                        {/* Subscription Progress & Details */}
                        {subscriptionInfo && !loading && (
                          <div className={`text-xs px-2 py-1 rounded-md border mt-2 ${
                            isPastSession 
                              ? 'bg-gray-100 text-gray-500 border-gray-300' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                <span className="font-medium">
                                  {subscriptionInfo.completedSessions}/{subscriptionInfo.sessionCount}
                                </span>
                              </div>
                              {subscriptionInfo.subscriptionName && (
                                <>
                                  <span>•</span>
                                  <span>{subscriptionInfo.subscriptionName}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{subscriptionInfo.sessionCount} lessons</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>${subscriptionInfo.totalPrice} {subscriptionInfo.currency}</span>
                              </div>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <CalendarScheduleIcon className="h-3 w-3" />
                                <span>
                                  {format(new Date(subscriptionInfo.startDate), 'dd MMM')} – {format(new Date(subscriptionInfo.endDate), 'dd MMM')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {loading && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Loading subscription details...
                          </div>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex-shrink-0 ml-4">
                        <Badge 
                          variant="outline" 
                          className={
                            isPastSession 
                              ? "bg-gray-100 text-gray-500 border-gray-300 opacity-70"
                              : session.status === "completed" ? "bg-green-50 text-green-700 border-green-300" :
                                session.status === "canceled" ? "bg-orange-50 text-orange-700 border-orange-300" :
                                session.status === "missed" ? "bg-red-50 text-red-700 border-red-300" :
                                "bg-blue-50 text-blue-700 border-blue-300"
                          }
                        >
                          <span className="mr-1">{renderStatusIcon(session.status)}</span>
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Show view mode specific title */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">
          Lessons for {getViewTitle()}
        </h2>
        <p className="text-sm text-muted-foreground">
          {sessions.length} lesson{sessions.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Render upcoming sessions */}
      {renderSessionGroup("Upcoming Lessons", upcomingSessions, viewMode !== 'day')}
      
      {/* Render past sessions if any */}
      {renderSessionGroup("Past Lessons", pastSessions, viewMode !== 'day')}
      
      {/* Fun empty state */}
      {upcomingSessions.length === 0 && pastSessions.length === 0 && (
        <FunEmptyState />
      )}
    </div>
  );
};

export default UpcomingLessonsList;

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
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  CalendarX,
  XCircle,
  CalendarDays,
  BookOpen,
  DollarSign,
  Calendar as CalendarScheduleIcon,
  Hash,
  Check,
  X,
  Calendar,
  ArrowRight,
  RefreshCcw
} from 'lucide-react';
import FunEmptyState from './FunEmptyState';
import { getStudentSubscriptions, handleSessionAction } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface UpcomingLessonsListProps {
  sessions: Session[];
  onLessonClick?: (session: Session) => void;
  onSessionUpdate?: () => void;
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

interface SessionActionResponse {
  success: boolean;
  message?: string;
  new_session_id?: string;
}

const UpcomingLessonsList: React.FC<UpcomingLessonsListProps> = ({ 
  sessions, 
  onLessonClick,
  onSessionUpdate,
  viewMode,
  currentDate,
  currentWeekStart
}) => {
  const [subscriptionInfoMap, setSubscriptionInfoMap] = useState<Map<string, SubscriptionInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusChangeSession, setStatusChangeSession] = useState<string | null>(null);

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
              
              // Find the active subscription and properly type it
              const activeSubscription = subscriptions.find(sub => sub.status === 'active') as Subscription | undefined;
              
              if (activeSubscription) {
                // Count completed sessions - using the correct property names
                const completedSessions = activeSubscription.sessions_completed ?? 0;
                
                // Calculate end date if not provided - using the correct property names
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

  // Handle session actions
  const handleSessionActionClick = async (sessionId: string, action: string, newDatetime?: Date) => {
    try {
      setActionLoading(sessionId);
      
      const response = await handleSessionAction(
        sessionId, 
        action, 
        newDatetime?.toISOString()
      );

      // Type cast the response to our expected format
      const typedResponse = response as unknown as SessionActionResponse;

      if (typedResponse.success) {
        toast.success(`Session ${action} successfully`);
        // Trigger refresh of sessions data
        if (onSessionUpdate) {
          onSessionUpdate();
        }
        // Close status change popup
        setStatusChangeSession(null);
      } else {
        toast.error(typedResponse.message || `Failed to ${action} session`);
      }
    } catch (error) {
      console.error(`Error handling session action ${action}:`, error);
      toast.error(`Failed to ${action} session`);
    } finally {
      setActionLoading(null);
    }
  };

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

  // Get session number - use sessionNumber from session if available, otherwise calculate from subscription
  const getSessionNumber = (session: Session): number => {
    // If the session already has a sessionNumber, use it
    if (session.sessionNumber) {
      return session.sessionNumber;
    }
    
    // Otherwise, try to calculate based on subscription info and session order
    // This is a fallback - ideally sessionNumber should come from the database
    return 1; // Default to 1 if we can't determine the session number
  };

  // Render status change options
  const renderStatusChangeOptions = (session: Session) => {
    const sessionId = session.id;
    const isLoading = actionLoading === sessionId;

    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleSessionActionClick(sessionId, "attended");
          }} 
          className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
        >
          <Check className="h-3 w-3 mr-1" />
          {actionLoading === "attended" ? "..." : "Mark Completed"}
        </Button>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleSessionActionClick(sessionId, "cancelled");
          }} 
          className="h-7 px-2 text-xs bg-orange-600 hover:bg-orange-700 text-white"
          disabled={isLoading}
        >
          <X className="h-3 w-3 mr-1" />
          {actionLoading === "cancelled" ? "..." : "Mark Cancelled"}
        </Button>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleSessionActionClick(sessionId, "moved");
          }} 
          className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          <ArrowRight className="h-3 w-3 mr-1" />
          {actionLoading === "moved" ? "..." : "Move"}
        </Button>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleSessionActionClick(sessionId, "rescheduled");
          }} 
          className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white"
          disabled={isLoading}
        >
          <RefreshCcw className="h-3 w-3 mr-1" />
          {actionLoading === "rescheduled" ? "..." : "Reschedule"}
        </Button>
      </div>
    );
  };

  // Render quick action buttons for scheduled sessions - now in a single row
  const renderQuickActionButtons = (session: Session) => {
    const sessionId = session.id;
    const isLoading = actionLoading === sessionId;

    return (
      <div className="grid grid-cols-4 gap-2 mt-2">
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleSessionActionClick(sessionId, "attended");
          }} 
          className="h-7 px-2 text-xs border-green-500 text-green-500 hover:bg-green-50"
          variant="outline"
          disabled={isLoading}
        >
          <Check className="h-3 w-3 mr-1" />
          {actionLoading === sessionId && actionLoading === "attended" ? "..." : "Mark as Attended"}
        </Button>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleSessionActionClick(sessionId, "cancelled");
          }} 
          className="h-7 px-2 text-xs border-red-500 text-red-500 hover:bg-red-50"
          variant="outline"
          disabled={isLoading}
        >
          <X className="h-3 w-3 mr-1" />
          {actionLoading === sessionId && actionLoading === "cancelled" ? "..." : "Cancel Session"}
        </Button>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleSessionActionClick(sessionId, "rescheduled");
          }} 
          className="h-7 px-2 text-xs border-orange-500 text-orange-500 hover:bg-orange-50"
          variant="outline"
          disabled={isLoading}
        >
          <RefreshCcw className="h-3 w-3 mr-1" />
          {actionLoading === sessionId && actionLoading === "rescheduled" ? "..." : "Reschedule"}
        </Button>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleSessionActionClick(sessionId, "moved");
          }} 
          className="h-7 px-2 text-xs border-blue-500 text-blue-500 hover:bg-blue-50"
          variant="outline"
          disabled={isLoading}
        >
          <ArrowRight className="h-3 w-3 mr-1" />
          {actionLoading === sessionId && actionLoading === "moved" ? "..." : "Move"}
        </Button>
      </div>
    );
  };

  // Render change status button for NON-SCHEDULED sessions only
  const renderChangeStatusButton = (session: Session) => {
    const sessionId = session.id;
    const isExpanded = statusChangeSession === sessionId;
    
    return (
      <div className="mt-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs border-purple-500 text-purple-500 hover:bg-purple-50"
          onClick={(e) => {
            e.stopPropagation();
            setStatusChangeSession(isExpanded ? null : sessionId);
          }}
        >
          <RefreshCcw className="h-3 w-3 mr-1" />
          Change Status
        </Button>
        
        {/* Show status change options when expanded */}
        {isExpanded && renderStatusChangeOptions(session)}
      </div>
    );
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
            const sessionNumber = getSessionNumber(session);
            
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
                        
                        {/* Session Number & Subscription Details */}
                        {subscriptionInfo && !loading && (
                          <div className={`text-xs px-2 py-1 rounded-md border mt-2 ${
                            isPastSession 
                              ? 'bg-gray-100 text-gray-500 border-gray-300' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                <span className="font-medium">
                                  {sessionNumber}
                                </span>
                              </div>
                              {subscriptionInfo.subscriptionName && (
                                <>
                                  <span>•</span>
                                  <span>{subscriptionInfo.subscriptionName}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{subscriptionInfo.sessionCount} lessons total</span>
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
                            Loading session details...
                          </div>
                        )}

                        {/* Show Quick Action Buttons for SCHEDULED sessions, Change Status for others */}
                        {session.status === "scheduled" ? 
                          renderQuickActionButtons(session) : 
                          renderChangeStatusButton(session)
                        }
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

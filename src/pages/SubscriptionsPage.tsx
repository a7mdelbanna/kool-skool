import React, { useState, useEffect, useContext } from 'react';
import { format, isPast, isFuture, isToday, addMinutes } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  CalendarX,
  ArrowRight,
  Check,
  XCircle,
  RefreshCcw,
  CalendarClock,
  Eye,
  FileText,
  Video,
  Users,
  BookOpen,
  DollarSign,
  ChevronRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import { handleSessionAction } from '@/integrations/supabase/client';

interface DatabaseSession {
  id: string;
  subscription_id: string;
  student_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  scheduled_datetime?: string;
  duration_minutes: number | null;
  status: string;
  payment_status: string;
  cost: number;
  notes: string | null;
  created_at: string;
  index_in_sub?: number | null;
  counts_toward_completion?: boolean;
  original_session_index?: number | null;
  moved_from_session_id?: string | null;
  meeting_link?: string | null;
  course_id?: string | null;
  course_name?: string | null;
}

interface SubscriptionInfo {
  id: string;
  session_count: number;
  duration_months: number;
  start_date: string;
  end_date: string | null;
  total_price: number;
  currency: string;
  status: string;
  schedule: any;
  notes: string | null;
  sessions: DatabaseSession[];
  student_name?: string;
  course_name?: string | null;
  course_id?: string | null;
}

const SubscriptionsPage: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [pastSubscriptions, setPastSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<DatabaseSession[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<DatabaseSession | null>(null);
  const [cancellationNotice, setCancellationNotice] = useState<number>(24);

  useEffect(() => {
    if (user?.id) {
      loadSubscriptions();
      loadCancellationSettings();
    }
  }, [user?.id]);

  const loadCancellationSettings = async () => {
    if (!user?.schoolId) return;

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('cancellation_notice_hours')
        .eq('id', user.schoolId)
        .single();

      if (data?.cancellation_notice_hours) {
        setCancellationNotice(data.cancellation_notice_hours);
      }
    } catch (error) {
      console.error('Error loading cancellation settings:', error);
    }
  };

  const loadSubscriptions = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get student ID from user
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError || !studentData) {
        console.error('Error getting student data:', studentError);
        return;
      }

      const studentId = studentData.id;

      // Get all subscriptions for the student
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .rpc('get_student_subscriptions', {
          p_student_id: studentId
        });

      if (subscriptionError) {
        console.error('Error loading subscriptions:', subscriptionError);
        toast({
          title: "Error",
          description: "Failed to load subscriptions",
          variant: "destructive",
        });
        return;
      }

      if (!subscriptionData || subscriptionData.length === 0) {
        setActiveSubscriptions([]);
        setPastSubscriptions([]);
        setUpcomingLessons([]);
        return;
      }

      // Get all sessions for the student
      const { data: sessionsData, error: sessionsError } = await supabase
        .rpc('get_lesson_sessions', {
          p_student_id: studentId
        });

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError);
        toast({
          title: "Error",
          description: "Failed to load sessions",
          variant: "destructive",
        });
        return;
      }

      const sessionsArray = Array.isArray(sessionsData) ? sessionsData as DatabaseSession[] : [];

      // Get course information for each subscription
      const subscriptionIds = subscriptionData.map(sub => sub.id);
      const { data: courseData } = await supabase
        .from('subscriptions')
        .select('id, course_id, courses(id, title)')
        .in('id', subscriptionIds);

      const courseMap = new Map();
      courseData?.forEach(item => {
        if (item.courses) {
          courseMap.set(item.id, {
            course_id: item.course_id,
            course_name: item.courses.title
          });
        }
      });

      // Group sessions by subscription
      const subscriptionsWithSessions: SubscriptionInfo[] = subscriptionData.map(sub => {
        const subscriptionSessions = sessionsArray.filter(session =>
          session.subscription_id === sub.id
        );

        const courseInfo = courseMap.get(sub.id);

        return {
          id: sub.id,
          session_count: sub.session_count,
          duration_months: sub.duration_months,
          start_date: sub.start_date,
          end_date: sub.end_date,
          total_price: sub.total_price,
          currency: sub.currency,
          status: sub.status,
          schedule: sub.schedule,
          notes: sub.notes,
          sessions: subscriptionSessions,
          course_id: courseInfo?.course_id,
          course_name: courseInfo?.course_name
        };
      });

      // Separate active and past subscriptions
      const active = subscriptionsWithSessions.filter(sub =>
        sub.status === 'active' || sub.status === 'paused'
      );
      const past = subscriptionsWithSessions.filter(sub =>
        sub.status === 'completed' || sub.status === 'cancelled'
      );

      // Get all upcoming lessons from active subscriptions
      const upcoming = active.flatMap(sub =>
        sub.sessions.filter(session => {
          const sessionDate = getSessionDateTime(session);
          return session.status === 'scheduled' && isFuture(sessionDate);
        })
      ).sort((a, b) => {
        const dateA = getSessionDateTime(a);
        const dateB = getSessionDateTime(b);
        return dateA.getTime() - dateB.getTime();
      });

      setActiveSubscriptions(active);
      setPastSubscriptions(past);
      setUpcomingLessons(upcoming);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSessionDateTime = (session: DatabaseSession): Date => {
    if (session.scheduled_datetime) {
      return new Date(session.scheduled_datetime);
    } else if (session.scheduled_time) {
      const dateStr = session.scheduled_date;
      const timeStr = session.scheduled_time;
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes, 0, 0);
    } else {
      return new Date(session.scheduled_date);
    }
  };

  const canCancelSession = (session: DatabaseSession): boolean => {
    const sessionDate = getSessionDateTime(session);
    const hoursUntilSession = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilSession >= cancellationNotice;
  };

  const handleCancelSession = async () => {
    if (!selectedSession) return;

    try {
      setLoading(true);
      const result = await handleSessionAction(selectedSession.id, 'cancelled');

      if (result.success) {
        toast({
          title: "Session Cancelled",
          description: "The session has been cancelled successfully",
        });
        await loadSubscriptions();
      } else {
        throw new Error(result.message || 'Failed to cancel session');
      }
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setCancelDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const handleJoinSession = (session: DatabaseSession) => {
    if (session.meeting_link) {
      window.open(session.meeting_link, '_blank');
    } else {
      toast({
        title: "No Meeting Link",
        description: "The meeting link for this session is not available yet",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    toast({
      title: "Refreshed",
      description: "Subscriptions and lessons have been updated",
    });
    setRefreshing(false);
  };

  const formatSchedule = (schedule: any) => {
    try {
      if (typeof schedule === 'string') {
        const parsed = JSON.parse(schedule);
        return Array.isArray(parsed)
          ? parsed.map(s => `${s.day} at ${s.time}`).join(', ')
          : schedule;
      }
      if (Array.isArray(schedule)) {
        return schedule.map(s => `${s.day} at ${s.time}`).join(', ');
      }
      return JSON.stringify(schedule);
    } catch {
      return schedule?.toString() || 'No schedule';
    }
  };

  const getSessionStatus = (session: DatabaseSession) => {
    const sessionDate = getSessionDateTime(session);
    const now = new Date();
    const sessionEnd = addMinutes(sessionDate, session.duration_minutes || 60);

    if (session.status !== 'scheduled') {
      return session.status;
    }

    if (isPast(sessionEnd)) {
      return 'past';
    } else if (isToday(sessionDate) && now >= sessionDate && now <= sessionEnd) {
      return 'ongoing';
    } else if (isToday(sessionDate)) {
      return 'today';
    }
    return 'upcoming';
  };

  const renderUpcomingLesson = (session: DatabaseSession) => {
    const sessionDate = getSessionDateTime(session);
    const status = getSessionStatus(session);
    const canCancel = canCancelSession(session);
    const hoursUntilSession = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);

    // Find the subscription for this session
    const subscription = activeSubscriptions.find(sub =>
      sub.sessions.some(s => s.id === session.id)
    );

    return (
      <Card key={session.id} className={cn(
        "mb-4 transition-all hover:shadow-md",
        status === 'ongoing' && "ring-2 ring-green-500 ring-offset-2",
        status === 'today' && "border-blue-500"
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {status === 'ongoing' && (
                  <Badge className="bg-green-500 text-white animate-pulse">
                    <Video className="h-3 w-3 mr-1" />
                    Ongoing Now
                  </Badge>
                )}
                {status === 'today' && (
                  <Badge variant="outline" className="border-blue-500 text-blue-500">
                    Today
                  </Badge>
                )}
                {session.index_in_sub && (
                  <Badge variant="secondary" className="text-xs">
                    Lesson #{session.index_in_sub}
                  </Badge>
                )}
              </div>

              <h4 className="font-semibold text-lg mb-1">
                {subscription?.course_name || 'General Course'}
              </h4>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(sessionDate, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{format(sessionDate, "h:mm a")} • {session.duration_minutes || 60} min</span>
                </div>
              </div>

              {session.notes && (
                <p className="text-sm text-muted-foreground mb-3">{session.notes}</p>
              )}

              <div className="flex gap-2">
                {(status === 'ongoing' || (status === 'today' && hoursUntilSession <= 0.25)) && (
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => handleJoinSession(session)}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Join Now
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/session/${session.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>

                {canCancel ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500 text-red-500 hover:bg-red-50"
                    onClick={() => {
                      setSelectedSession(session);
                      setCancelDialogOpen(true);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    <span>Cannot cancel (less than {cancellationNotice}h notice)</span>
                  </div>
                )}
              </div>
            </div>

            {session.cost > 0 && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Lesson Fee</div>
                <div className="font-semibold">${session.cost.toFixed(2)}</div>
                <Badge variant="outline" className={cn(
                  "mt-1",
                  session.payment_status === 'paid' ? "border-green-500 text-green-500" : "border-amber-500 text-amber-500"
                )}>
                  {session.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSubscription = (subscription: SubscriptionInfo, isPast: boolean = false) => {
    const completedSessions = subscription.sessions.filter(s =>
      s.status === 'completed' && s.counts_toward_completion
    ).length;

    const upcomingSessions = subscription.sessions.filter(s => {
      const sessionDate = getSessionDateTime(s);
      return s.status === 'scheduled' && isFuture(sessionDate);
    }).length;

    const progressPercentage = (completedSessions / subscription.session_count) * 100;

    return (
      <Card key={subscription.id} className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                {subscription.course_name || 'General Course'}
              </CardTitle>
              <CardDescription>
                {subscription.session_count} Sessions • {subscription.duration_months} Month{subscription.duration_months !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Badge variant={isPast ? "secondary" : "default"} className={cn(
              subscription.status === 'active' && "bg-green-500",
              subscription.status === 'paused' && "bg-yellow-500",
              subscription.status === 'completed' && "bg-blue-500",
              subscription.status === 'cancelled' && "bg-red-500"
            )}>
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{completedSessions} / {subscription.session_count} completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Subscription Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Schedule:</span>
                <p className="font-medium">{formatSchedule(subscription.schedule)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <p className="font-medium">
                  {format(new Date(subscription.start_date), 'MMM d, yyyy')} -
                  {subscription.end_date ? format(new Date(subscription.end_date), 'MMM d, yyyy') : 'Ongoing'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Price:</span>
                <p className="font-medium">{subscription.currency} {subscription.total_price.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Sessions:</span>
                <div className="flex gap-4">
                  <span className="text-green-600 font-medium">{completedSessions} Done</span>
                  <span className="text-blue-600 font-medium">{upcomingSessions} Upcoming</span>
                </div>
              </div>
            </div>

            {/* View Sessions Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="sessions" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    View All Sessions ({subscription.sessions.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {subscription.sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No sessions scheduled yet
                      </p>
                    ) : (
                      subscription.sessions
                        .sort((a, b) => getSessionDateTime(a).getTime() - getSessionDateTime(b).getTime())
                        .map(session => {
                          const sessionDate = getSessionDateTime(session);
                          return (
                            <div
                              key={session.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border",
                                session.status === 'completed' && "bg-green-50 border-green-200",
                                session.status === 'cancelled' && "bg-red-50 border-red-200",
                                session.status === 'scheduled' && isPast(sessionDate) && "bg-gray-50 border-gray-200"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-sm">
                                  <p className="font-medium">
                                    {format(sessionDate, "MMM d, yyyy")} at {format(sessionDate, "h:mm a")}
                                  </p>
                                  {session.notes && (
                                    <p className="text-xs text-muted-foreground">{session.notes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(
                                  session.status === 'completed' && "border-green-500 text-green-500",
                                  session.status === 'cancelled' && "border-red-500 text-red-500",
                                  session.status === 'scheduled' && "border-blue-500 text-blue-500",
                                  session.status === 'rescheduled' && "border-purple-500 text-purple-500"
                                )}>
                                  {session.status === 'rescheduled' ? 'Moved' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => navigate(`/session/${session.id}`)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Subscriptions & Lessons</h1>
          <p className="text-muted-foreground">Manage your course subscriptions and upcoming lessons</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCcw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Cancellation Notice Alert */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Sessions must be cancelled at least {cancellationNotice} hours in advance.
          Late cancellations may incur charges.
        </AlertDescription>
      </Alert>

      {/* Upcoming Lessons Section */}
      {upcomingLessons.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Upcoming Lessons ({upcomingLessons.length})
          </h2>
          <div className="space-y-4">
            {upcomingLessons.slice(0, 5).map(renderUpcomingLesson)}
            {upcomingLessons.length > 5 && (
              <Alert>
                <AlertDescription>
                  Showing 5 of {upcomingLessons.length} upcoming lessons.
                  View your active subscriptions below to see all sessions.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Subscriptions Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active Subscriptions ({activeSubscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past Subscriptions ({pastSubscriptions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeSubscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Active Subscriptions</h3>
                <p className="text-muted-foreground">
                  You don't have any active course subscriptions at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeSubscriptions.map(sub => renderSubscription(sub))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastSubscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Past Subscriptions</h3>
                <p className="text-muted-foreground">
                  You don't have any completed subscriptions yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastSubscriptions.map(sub => renderSubscription(sub, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Session Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session?
              This action cannot be undone and may affect your subscription progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Session</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSession}
              className="bg-red-500 hover:bg-red-600"
            >
              Yes, Cancel Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionsPage;
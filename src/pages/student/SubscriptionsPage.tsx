import React, { useContext, useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  Video,
  Users,
  BookOpen,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Timer,
  MapPin,
  User,
  CalendarDays,
  CreditCard,
  Info,
  X,
  Loader2,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, isBefore, addDays, parseISO, isFuture, isToday, isPast, addMinutes } from 'date-fns';
import { supabase, handleSessionAction } from '@/integrations/supabase/client';
import SessionTimeDisplay from '@/components/SessionTimeDisplay';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import { StudentPaymentUpload } from '@/components/StudentPaymentUpload';

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
  course_name?: string | null;
  course_id?: string | null;
  payment_status?: string;
  paid_amount?: number;
  teacher_id?: string;
  teacher_name?: string;
  teacher_zoom_link?: string;
}

interface TeacherInfo {
  id: string;
  first_name: string;
  last_name: string;
  zoom_link?: string;
}

const SubscriptionsPage: React.FC = () => {
  const { studentData } = useOutletContext<any>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSubscriptions, setActiveSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [pastSubscriptions, setPastSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<DatabaseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<DatabaseSession | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionInfo | null>(null);
  const [cancellationNotice, setCancellationNotice] = useState<number>(24);
  const [teachers, setTeachers] = useState<Map<string, TeacherInfo>>(new Map());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentSubscription, setSelectedPaymentSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    if (studentData?.id) {
      loadSubscriptions();
      loadCancellationSettings();
    }
  }, [studentData]);

  const loadCancellationSettings = async () => {
    if (!studentData?.schoolId) return;

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('cancellation_notice_hours')
        .eq('id', studentData.schoolId)
        .single();

      if (data?.cancellation_notice_hours) {
        setCancellationNotice(data.cancellation_notice_hours);
      }
    } catch (error) {
      console.error('Error loading cancellation settings:', error);
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

  const loadSubscriptions = async () => {
    if (!studentData?.id) return;

    setLoading(true);
    try {
      // Get all subscriptions for the student
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .rpc('get_student_subscriptions', {
          p_student_id: studentData.id
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
          p_student_id: studentData.id
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

      // Get course and teacher information for each subscription
      const subscriptionIds = subscriptionData.map((sub: any) => sub.id);
      const { data: subscriptionDetails } = await supabase
        .from('subscriptions')
        .select(`
          id,
          course_id,
          teacher_id,
          courses(id, title)
        `)
        .in('id', subscriptionIds);

      // Get unique teacher IDs
      const teacherIds = [...new Set(subscriptionDetails?.map((s: any) => s.teacher_id).filter(Boolean))];

      // Fetch teacher/admin information for all teacher IDs (regardless of role)
      const { data: teacherData } = await supabase
        .from('users')
        .select('id, first_name, last_name, zoom_link')
        .in('id', teacherIds);

      const courseMap = new Map();
      const teacherMap = new Map<string, TeacherInfo>();

      // Map teachers regardless of role
      teacherData?.forEach((teacher: any) => {
        teacherMap.set(teacher.id, {
          id: teacher.id,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          zoom_link: teacher.zoom_link
        });
      });

      subscriptionDetails?.forEach((item: any) => {
        if (item.courses) {
          courseMap.set(item.id, {
            course_id: item.course_id,
            course_name: item.courses.title
          });
        }
      });

      setTeachers(teacherMap);

      // Get payment information for subscriptions
      const { data: paymentData } = await supabase
        .from('payments')
        .select('subscription_id, amount, status')
        .in('subscription_id', subscriptionIds);

      const paymentMap = new Map();
      paymentData?.forEach((payment: any) => {
        if (!paymentMap.has(payment.subscription_id)) {
          paymentMap.set(payment.subscription_id, {
            paid_amount: 0,
            payment_status: 'unpaid'
          });
        }
        const existing = paymentMap.get(payment.subscription_id);
        if (payment.status === 'paid' || payment.status === 'completed') {
          existing.paid_amount += payment.amount;
          existing.payment_status = existing.paid_amount >= payment.amount ? 'paid' : 'partial';
        }
      });

      // Group sessions by subscription
      const subscriptionsWithSessions: SubscriptionInfo[] = subscriptionData.map((sub: any) => {
        const subscriptionSessions = sessionsArray.filter(session =>
          session.subscription_id === sub.id
        );

        const courseInfo = courseMap.get(sub.id);
        const paymentInfo = paymentMap.get(sub.id) || { paid_amount: 0, payment_status: 'unpaid' };
        const subscriptionDetail = subscriptionDetails?.find((s: any) => s.id === sub.id);
        const teacher = subscriptionDetail?.teacher_id ? teacherMap.get(subscriptionDetail.teacher_id) : null;

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
          course_name: courseInfo?.course_name,
          payment_status: paymentInfo.paid_amount >= sub.total_price ? 'paid' :
                          paymentInfo.paid_amount > 0 ? 'partial' : 'unpaid',
          paid_amount: paymentInfo.paid_amount,
          teacher_id: subscriptionDetail?.teacher_id,
          teacher_name: teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Not assigned' : null,
          teacher_zoom_link: teacher?.zoom_link
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

      // Set the first active subscription as selected
      if (active.length > 0 && !selectedSubscription) {
        setSelectedSubscription(active[0]);
      }
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    toast({
      title: "Refreshed",
      description: "Subscriptions and lessons have been updated",
    });
    setRefreshing(false);
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

  const handleJoinSession = async (session: DatabaseSession) => {
    // First try session meeting link
    if (session.meeting_link) {
      window.open(session.meeting_link, '_blank');
      return;
    }

    // Then try to get teacher's zoom link from subscription
    const subscription = activeSubscriptions.find(sub =>
      sub.sessions.some(s => s.id === session.id)
    );

    if (subscription?.teacher_zoom_link) {
      window.open(subscription.teacher_zoom_link, '_blank');
      return;
    }

    // Finally try the teachers map
    if (subscription?.teacher_id) {
      const teacher = teachers.get(subscription.teacher_id);
      if (teacher?.zoom_link) {
        window.open(teacher.zoom_link, '_blank');
        return;
      }
    }

    toast({
      title: "No Meeting Link",
      description: "The meeting link is not available. Please contact your teacher.",
      variant: "destructive",
    });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case 'rescheduled':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400"><RefreshCw className="h-3 w-3 mr-1" />Rescheduled</Badge>;
      case 'moved':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400"><ArrowRight className="h-3 w-3 mr-1" />Moved</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePayment = (subscription: SubscriptionInfo) => {
    setSelectedPaymentSubscription(subscription);
    setPaymentDialogOpen(true);
  };

  const renderSessionRow = (session: DatabaseSession, subscription?: SubscriptionInfo) => {
    const sessionDate = getSessionDateTime(session);
    const status = getSessionStatus(session);
    const canCancel = canCancelSession(session);

    return (
      <div
        key={session.id}
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border dark:border-gray-700",
          session.status === 'completed' && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900",
          session.status === 'cancelled' && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
          session.status === 'scheduled' && isPast(sessionDate) && "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700"
        )}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="text-sm">
            <p className="font-medium dark:text-white">
              {format(sessionDate, "MMM d, yyyy")} at {format(sessionDate, "h:mm a")}
            </p>
            {session.notes && (
              <p className="text-xs text-muted-foreground dark:text-gray-400">{session.notes}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(session.status)}
          {session.status === 'scheduled' && isFuture(sessionDate) && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-green-500 text-green-500 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950"
                onClick={() => handleJoinSession(session)}
              >
                <Video className="h-4 w-4 mr-1" />
                Join
              </Button>
              {canCancel ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-500 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={() => {
                    setSelectedSession(session);
                    setCancelDialogOpen(true);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground dark:text-gray-500">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  {cancellationNotice}h notice required
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Subscriptions</h1>
          <p className="text-muted-foreground mt-2 dark:text-gray-400">Manage your course subscriptions and upcoming sessions</p>
        </div>
        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 px-4 py-2">
          <Sparkles className="h-4 w-4 mr-2" />
          {activeSubscriptions.length} Active
        </Badge>
      </motion.div>

      {/* Cancellation Notice Alert */}
      <Alert className="dark:bg-gray-800 dark:border-gray-700">
        <AlertCircle className="h-4 w-4 dark:text-gray-400" />
        <AlertDescription className="dark:text-gray-300">
          Sessions must be cancelled at least {cancellationNotice} hours in advance.
          Late cancellations may incur charges.
        </AlertDescription>
      </Alert>

      {/* Tabs - Moved above upcoming lessons */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 dark:bg-gray-800">
          <TabsTrigger value="active" className="relative dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
            Active Subscriptions
            {activeSubscriptions.length > 0 && (
              <span className="ml-2 text-xs bg-blue-500 text-white rounded-full px-2">
                {activeSubscriptions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
            Past Subscriptions
            {pastSubscriptions.length > 0 && (
              <span className="ml-2 text-xs bg-slate-500 text-white rounded-full px-2">
                {pastSubscriptions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active Subscriptions */}
        <TabsContent value="active" className="mt-6">
          {activeSubscriptions.length === 0 ? (
            <Card className="p-12 text-center dark:bg-gray-800 dark:border-gray-700">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 dark:text-white">No Active Subscriptions</h3>
              <p className="text-muted-foreground dark:text-gray-400">You don't have any active subscriptions at the moment.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Subscription List */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Your Subscriptions</h3>
                {activeSubscriptions.map((subscription) => {
                  const completedSessions = subscription.sessions.filter(s =>
                    s.status === 'completed' && s.counts_toward_completion
                  ).length;

                  return (
                    <motion.div
                      key={subscription.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        className={cn(
                          "cursor-pointer transition-all dark:bg-gray-800 dark:border-gray-700",
                          selectedSubscription?.id === subscription.id
                            ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:shadow-lg dark:hover:bg-gray-750'
                        )}
                        onClick={() => setSelectedSubscription(subscription)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {subscription.course_name || 'General Course'}
                              </h4>
                              {subscription.teacher_name && (
                                <p className="text-xs text-muted-foreground dark:text-gray-400">
                                  {subscription.teacher_name}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground dark:text-gray-400">
                                {subscription.session_count} Sessions • {subscription.duration_months} Month{subscription.duration_months !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <Badge className={cn(
                              subscription.status === 'active' ? "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400" :
                              subscription.status === 'paused' ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400" :
                              "bg-gray-500/10 text-gray-600 border-gray-500/20 dark:bg-gray-500/20 dark:text-gray-400"
                            )}>
                              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-muted-foreground dark:text-gray-400">
                              <CalendarDays className="h-4 w-4 mr-2" />
                              <span>{format(new Date(subscription.start_date), 'MMM d')} - {subscription.end_date ? format(new Date(subscription.end_date), 'MMM d, yyyy') : 'Ongoing'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground dark:text-gray-400">Sessions</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {completedSessions}/{subscription.session_count}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                style={{ width: `${(completedSessions / subscription.session_count) * 100}%` }}
                              />
                            </div>

                            {/* Payment Status */}
                            {subscription.payment_status !== 'paid' && (
                              <div className="pt-2">
                                <Button
                                  size="sm"
                                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePayment(subscription);
                                  }}
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Pay {subscription.currency} {(subscription.total_price - (subscription.paid_amount || 0)).toFixed(2)}
                                </Button>
                                {subscription.paid_amount && subscription.paid_amount > 0 && (
                                  <p className="text-xs text-muted-foreground dark:text-gray-400 text-center mt-1">
                                    Paid: {subscription.currency} {subscription.paid_amount.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Selected Subscription Details */}
              {selectedSubscription && (
                <div className="lg:col-span-2">
                  <Card className="dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="dark:text-white">Subscription Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">Course</p>
                            <p className="font-medium dark:text-white">{selectedSubscription.course_name || 'General Course'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">Teacher</p>
                            <p className="font-medium dark:text-white">{selectedSubscription.teacher_name || 'Not assigned'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">Status</p>
                            <p className="font-medium dark:text-white">{selectedSubscription.status.charAt(0).toUpperCase() + selectedSubscription.status.slice(1)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">Schedule</p>
                            <p className="font-medium dark:text-white">{formatSchedule(selectedSubscription.schedule)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">Total Price</p>
                            <p className="font-medium dark:text-white">{selectedSubscription.currency} {selectedSubscription.total_price.toFixed(2)}</p>
                          </div>
                        </div>

                        <Separator className="dark:bg-gray-700" />

                        <div>
                          <h4 className="font-semibold mb-3 dark:text-white">Sessions</h4>
                          <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-2">
                              {selectedSubscription.sessions.length === 0 ? (
                                <p className="text-sm text-muted-foreground dark:text-gray-400 text-center py-4">
                                  No sessions scheduled yet
                                </p>
                              ) : (
                                selectedSubscription.sessions
                                  .sort((a, b) => getSessionDateTime(a).getTime() - getSessionDateTime(b).getTime())
                                  .map(session => renderSessionRow(session, selectedSubscription))
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Past Subscriptions */}
        <TabsContent value="past" className="mt-6">
          {pastSubscriptions.length === 0 ? (
            <Card className="p-12 text-center dark:bg-gray-800 dark:border-gray-700">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 dark:text-white">No Past Subscriptions</h3>
              <p className="text-muted-foreground dark:text-gray-400">You don't have any completed subscriptions yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastSubscriptions.map((subscription) => {
                const completedSessions = subscription.sessions.filter(s =>
                  s.status === 'completed' && s.counts_toward_completion
                ).length;

                return (
                  <Card key={subscription.id} className="dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg dark:text-white">
                            {subscription.course_name || 'General Course'}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            {subscription.session_count} Sessions • {subscription.duration_months} Month{subscription.duration_months !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-300">
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm">
                          <p className="text-muted-foreground dark:text-gray-400">Duration</p>
                          <p className="font-medium dark:text-white">
                            {format(new Date(subscription.start_date), 'MMM d, yyyy')} -
                            {subscription.end_date ? format(new Date(subscription.end_date), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground dark:text-gray-400">Completed Sessions</p>
                          <p className="font-medium dark:text-white">{completedSessions} / {subscription.session_count}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          onClick={() => {
                            setSelectedSubscription(subscription);
                            setActiveTab('active');
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upcoming Lessons Section - Moved below tabs */}
      {upcomingLessons.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 dark:text-white">
            <CalendarDays className="h-5 w-5" />
            Upcoming Lessons ({upcomingLessons.length})
          </h2>
          <Alert className="mb-4 dark:bg-gray-800 dark:border-gray-700">
            <AlertDescription className="dark:text-gray-300">
              Showing {Math.min(3, upcomingLessons.length)} of {upcomingLessons.length} upcoming lessons.
              View your active subscriptions above to see all sessions.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            {upcomingLessons.slice(0, 3).map((session) => {
              const subscription = activeSubscriptions.find(sub =>
                sub.sessions.some(s => s.id === session.id)
              );

              return (
                <Card key={session.id} className="dark:bg-gray-800 dark:border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1 dark:text-white">
                          {subscription?.course_name || 'General Course'}
                        </h4>
                        {subscription?.teacher_name && (
                          <p className="text-sm text-muted-foreground dark:text-gray-400 mb-1">
                            <User className="h-3 w-3 inline mr-1" />
                            Teacher: {subscription.teacher_name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(getSessionDateTime(session), "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{format(getSessionDateTime(session), "h:mm a")} • {session.duration_minutes || 60} min</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleJoinSession(session)}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Join
                          </Button>
                          {canCancelSession(session) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500 text-red-500 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950"
                              onClick={() => {
                                setSelectedSession(session);
                                setCancelDialogOpen(true);
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-500">
                              <AlertCircle className="h-3 w-3" />
                              <span>Cannot cancel (less than {cancellationNotice}h notice)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Session Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Cancel Session</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              Are you sure you want to cancel this session?
              This action cannot be undone and may affect your subscription progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600">
              Keep Session
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSession}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Yes, Cancel Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Dialog */}
      {selectedPaymentSubscription && (
        <StudentPaymentUpload
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          subscriptionId={selectedPaymentSubscription.id}
          studentId={studentData.id}
          amount={selectedPaymentSubscription.total_price - (selectedPaymentSubscription.paid_amount || 0)}
          currency={selectedPaymentSubscription.currency}
          onSuccess={() => {
            loadSubscriptions();
            setPaymentDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default SubscriptionsPage;
import React, { useContext, useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  DollarSign,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, isBefore, addDays, parseISO, isFuture, isToday, isPast, addMinutes } from 'date-fns';
import { supabase, handleSessionAction } from '@/integrations/supabase/client';
import SessionTimeDisplay from '@/components/SessionTimeDisplay';
import { teachersService } from '@/services/firebase/teachers.service';
import { databaseService } from '@/services/firebase/database.service';
import { Link } from 'react-router-dom';
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
import SessionDetailsDialog from '@/components/student-tabs/SessionDetailsDialog';

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
  const { t } = useTranslation(['subscription', 'common']);
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
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDetailsSessionId, setSelectedDetailsSessionId] = useState<string>('');
  const [selectedDetailsSessionData, setSelectedDetailsSessionData] = useState<any>(null);

  useEffect(() => {
    if (studentData?.id) {
      loadSubscriptions();
      loadCancellationSettings();

      // Set up Firebase real-time listeners for subscriptions and sessions
      const setupFirebaseListeners = async () => {
        const { collection, query: firebaseQuery, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');

        // Listen for subscription changes
        const subscriptionsRef = collection(db, 'subscriptions');
        const subQuery = firebaseQuery(subscriptionsRef, where('studentId', '==', studentData.id));

        const unsubscribeSubscriptions = onSnapshot(subQuery, (snapshot) => {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'modified') {
              console.log('Firebase subscription modified:', change.doc.id);
              loadSubscriptions();
            }
          });
        });

        // Listen for session changes (when subscriptions are updated)
        const sessionsRef = collection(db, 'sessions');
        const sessionQuery = firebaseQuery(sessionsRef, where('studentId', '==', studentData.id));

        const unsubscribeSessions = onSnapshot(sessionQuery, (snapshot) => {
          console.log(`Firebase sessions changed (${snapshot.docChanges().length} changes), reloading...`);
          loadSubscriptions();
        });

        return () => {
          unsubscribeSubscriptions();
          unsubscribeSessions();
        };
      };

      const cleanupPromise = setupFirebaseListeners();
      return () => {
        cleanupPromise.then(cleanup => cleanup && cleanup());
      };
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

      let sessionsArray = Array.isArray(sessionsData) ? sessionsData as DatabaseSession[] : [];

      // Also fetch sessions from Firebase to get the latest regenerated sessions
      try {
        const { collection, query: firebaseQuery, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');

        // Get all subscription IDs for this student
        const subscriptionIds = subscriptionData.map((sub: any) => sub.id);

        // Fetch sessions from Firebase for all subscriptions
        const sessionsRef = collection(db, 'sessions');
        const sessionsPromises = subscriptionIds.map(async (subId: string) => {
          // Try both field names for subscription ID
          let q = firebaseQuery(sessionsRef, where('subscriptionId', '==', subId));
          let snapshot = await getDocs(q);

          // If no results with camelCase, try snake_case
          if (snapshot.empty) {
            q = firebaseQuery(sessionsRef, where('subscription_id', '==', subId));
            snapshot = await getDocs(q);
          }
          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              subscription_id: data.subscriptionId || subId,
              student_id: data.studentId || studentData.id,
              scheduled_date: data.scheduledDate || data.scheduled_date,
              scheduled_time: data.scheduledTime || data.scheduled_time,
              scheduled_datetime: data.scheduledDateTime || data.scheduled_datetime,
              duration_minutes: data.durationMinutes || data.duration_minutes || 60,
              status: data.status || 'scheduled',
              attended: data.attended || false,
              counts_toward_completion: data.countsTowardCompletion ?? data.counts_toward_completion ?? true,
              session_number: data.sessionNumber || data.session_number,
              teacher_id: data.teacherId || data.teacher_id,
              created_at: data.createdAt || data.created_at,
              updated_at: data.updatedAt || data.updated_at
            };
          });
        });

        const firebaseSessionsArrays = await Promise.all(sessionsPromises);
        const firebaseSessions = firebaseSessionsArrays.flat();

        console.log(`Firebase sessions for subscriptions:`, subscriptionIds);
        console.log(`Found ${firebaseSessions.length} Firebase sessions`);
        if (firebaseSessions.length > 0) {
          console.log('Sample Firebase session:', firebaseSessions[0]);
        }

        // If we have Firebase sessions for a subscription, use them exclusively (don't merge)
        // This ensures we get the regenerated sessions
        const firebaseSubscriptionIds = new Set(firebaseSessions.map(s => s.subscription_id));

        // Keep only Supabase sessions for subscriptions that don't have Firebase sessions
        const supabaseSessionsToKeep = sessionsArray.filter(session =>
          !firebaseSubscriptionIds.has(session.subscription_id)
        );

        // Combine: Firebase sessions + Supabase sessions (for subscriptions without Firebase data)
        sessionsArray = [...firebaseSessions, ...supabaseSessionsToKeep];

        console.log(`Loaded ${firebaseSessions.length} sessions from Firebase`);
        console.log(`Kept ${supabaseSessionsToKeep.length} Supabase sessions for other subscriptions`);
        console.log(`Total sessions: ${sessionsArray.length}`);
      } catch (error) {
        console.warn('Could not fetch Firebase sessions:', error);
        // Continue with Supabase sessions if Firebase fails
      }

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

      // Also fetch teacher info from Firebase subscriptions collection
      try {
        // Use Firebase query instead of non-existent getByField
        const { collection, query: firebaseQuery, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');

        const subscriptionsRef = collection(db, 'subscriptions');
        const q = firebaseQuery(subscriptionsRef, where('studentId', '==', studentData.id));
        const snapshot = await getDocs(q);

        const firebaseSubscriptions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Get unique teacher IDs from Firebase
        const firebaseTeacherIds = [...new Set(firebaseSubscriptions
          .map(sub => sub.teacherId)
          .filter(Boolean))];

        // Fetch teacher details from Firebase users collection
        const { doc, getDoc } = await import('firebase/firestore');
        for (const teacherId of firebaseTeacherIds) {
          if (!teacherMap.has(teacherId)) {
            try {
              const userDocRef = doc(db, 'users', teacherId);
              const userSnapshot = await getDoc(userDocRef);

              if (userSnapshot.exists()) {
                const teacher = userSnapshot.data();
                teacherMap.set(teacherId, {
                  id: teacherId,
                  first_name: teacher.firstName || teacher.first_name,
                  last_name: teacher.lastName || teacher.last_name,
                  zoom_link: teacher.zoomLink || teacher.zoom_link
                });
                console.log(`Loaded teacher from Firebase: ${teacher.firstName} ${teacher.lastName}`);
              }
            } catch (error) {
              console.warn(`Could not fetch teacher ${teacherId} from Firebase:`, error);
            }
          }
        }

        // Update subscription data with Firebase teacher IDs
        subscriptionData.forEach((sub: any) => {
          const fbSub = firebaseSubscriptions.find(fs => fs.id === sub.id);
          if (fbSub && fbSub.teacherId) {
            sub.teacher_id = fbSub.teacherId;
            console.log(`Added teacher_id ${fbSub.teacherId} to subscription ${sub.id}`);
          }
        });

        // Update the teachers state with the complete teacher map
        setTeachers(new Map(teacherMap));
      } catch (error) {
        console.warn('Could not fetch Firebase subscription data:', error);
      }

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

        console.log(`Subscription ${sub.id} has ${subscriptionSessions.length} sessions:`,
          subscriptionSessions.map(s => ({
            date: s.scheduled_date,
            time: s.scheduled_time,
            status: s.status
          })));

        const courseInfo = courseMap.get(sub.id);
        const paymentInfo = paymentMap.get(sub.id) || { paid_amount: 0, payment_status: 'unpaid' };
        const subscriptionDetail = subscriptionDetails?.find((s: any) => s.id === sub.id);

        // Try to get teacher_id from multiple sources
        const teacherId = sub.teacher_id || subscriptionDetail?.teacher_id;
        const teacher = teacherId ? teacherMap.get(teacherId) : null;

        console.log(`Subscription ${sub.id}: teacher_id=${teacherId}, teacher found=${!!teacher}, teacherMap size=${teacherMap.size}`);
      if (teacherId && !teacher) {
        console.log('Available teachers in map:', Array.from(teacherMap.keys()));
      }

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
          teacher_id: teacherId,
          teacher_name: teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : 'Не назначен',
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
          ? parsed.map(s => `${s.day} ${t('subscription:at')} ${s.time}`).join(', ')
          : schedule;
      }
      if (Array.isArray(schedule)) {
        return schedule.map(s => `${s.day} ${t('subscription:at')} ${s.time}`).join(', ');
      }
      return JSON.stringify(schedule);
    } catch {
      return schedule?.toString() || 'No schedule';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />{t('subscription:completed')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />{t('subscription:cancelled')}</Badge>;
      case 'rescheduled':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400"><RefreshCw className="h-3 w-3 mr-1" />{t('subscription:rescheduled')}</Badge>;
      case 'moved':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400"><ArrowRight className="h-3 w-3 mr-1" />{t('subscription:moved')}</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400"><Clock className="h-3 w-3 mr-1" />{t('subscription:scheduled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePayment = (subscription: SubscriptionInfo) => {
    setSelectedPaymentSubscription(subscription);
    setPaymentDialogOpen(true);
  };

  const handleOpenSessionDetails = (sessionId: string, sessionData?: DatabaseSession, subscription?: SubscriptionInfo) => {
    // Enhance session data with subscription info
    const enhancedSessionData = {
      ...sessionData,
      student_name: studentData?.firstName ? `${studentData.firstName} ${studentData.lastName || ''}`.trim() : 'N/A',
      course_name: subscription?.course_name || 'General Course'
    };

    setSelectedDetailsSessionId(sessionId);
    setSelectedDetailsSessionData(enhancedSessionData);
    setDetailsDialogOpen(true);
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
              <SessionTimeDisplay
                date={sessionDate}
                showDate={true}
                showTime={true}
                className=""
              />
            </p>
            {session.notes && (
              <p className="text-xs text-muted-foreground dark:text-gray-400">{session.notes}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(session.status)}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenSessionDetails(session.id, session, subscription)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('subscription:title')}</h1>
          <p className="text-muted-foreground mt-2 dark:text-gray-400">{t('subscription:description')}</p>
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
          {t('subscription:cancellationNotice')}
        </AlertDescription>
      </Alert>

      {/* Tabs - Moved above upcoming lessons */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 dark:bg-gray-800">
          <TabsTrigger value="active" className="relative dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
            {t('subscription:activeSubscriptions')}
            {activeSubscriptions.length > 0 && (
              <span className="ml-2 text-xs bg-blue-500 text-white rounded-full px-2">
                {activeSubscriptions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
            {t('subscription:pastSubscriptions')}
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
              <h3 className="text-lg font-semibold mb-2 dark:text-white">{t('subscription:noActiveSubscriptions')}</h3>
              <p className="text-muted-foreground dark:text-gray-400">{t('subscription:noActiveSubscriptionsDesc')}</p>
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
                                {subscription.course_name || t('subscription:generalCourse')}
                              </h4>
                              {subscription.teacher_name && subscription.teacher_id && (
                                <Link
                                  to={`/teacher/${subscription.teacher_id}`}
                                  className="text-xs text-muted-foreground dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                                >
                                  <User className="h-3 w-3" />
                                  {subscription.teacher_name}
                                </Link>
                              )}
                              {subscription.teacher_name && !subscription.teacher_id && (
                                <p className="text-xs text-muted-foreground dark:text-gray-400 inline-flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {subscription.teacher_name}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground dark:text-gray-400">
                                {subscription.session_count} {t('subscription:sessions')} • {subscription.duration_months} {subscription.duration_months !== 1 ? t('subscription:months') : t('subscription:month')}
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
                              <span>{format(new Date(subscription.start_date), 'MMM d')} - {subscription.end_date ? format(new Date(subscription.end_date), 'MMM d, yyyy') : t('subscription:ongoing')}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground dark:text-gray-400">{t('subscription:sessions')}</span>
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
                                  {t('subscription:pay')} {subscription.currency} {(subscription.total_price - (subscription.paid_amount || 0)).toFixed(2)}
                                </Button>
                                {subscription.paid_amount && subscription.paid_amount > 0 && (
                                  <p className="text-xs text-muted-foreground dark:text-gray-400 text-center mt-1">
                                    {t('subscription:paid')}: {subscription.currency} {subscription.paid_amount.toFixed(2)}
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
                      <CardTitle className="dark:text-white">{t('subscription:subscriptionDetails')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">{t('subscription:course')}</p>
                            <p className="font-medium dark:text-white">{selectedSubscription.course_name || t('subscription:generalCourse')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">{t('subscription:teacher')}</p>
                            {selectedSubscription.teacher_id && selectedSubscription.teacher_name ? (
                              <Link
                                to={`/student-dashboard/teacher/${selectedSubscription.teacher_id}`}
                                className="font-medium dark:text-white text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                              >
                                {selectedSubscription.teacher_name}
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            ) : (
                              <p className="font-medium dark:text-white">{selectedSubscription.teacher_name || t('subscription:notAssigned')}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">{t('subscription:status')}</p>
                            <p className="font-medium dark:text-white">{selectedSubscription.status.charAt(0).toUpperCase() + selectedSubscription.status.slice(1)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">{t('subscription:schedule')}</p>
                            <p className="font-medium dark:text-white">{formatSchedule(selectedSubscription.schedule)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">{t('subscription:totalPrice')}</p>
                            <p className="font-medium dark:text-white">{selectedSubscription.currency} {selectedSubscription.total_price.toFixed(2)}</p>
                          </div>
                        </div>

                        <Separator className="dark:bg-gray-700" />

                        <div>
                          <h4 className="font-semibold mb-3 dark:text-white">{t('subscription:sessions')}</h4>
                          <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-2">
                              {selectedSubscription.sessions.length === 0 ? (
                                <p className="text-sm text-muted-foreground dark:text-gray-400 text-center py-4">
                                  {t('subscription:noSessionsScheduled')}
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
              <h3 className="text-lg font-semibold mb-2 dark:text-white">{t('subscription:noPastSubscriptions')}</h3>
              <p className="text-muted-foreground dark:text-gray-400">{t('subscription:noPastSubscriptionsDesc')}</p>
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
                            {subscription.course_name || t('subscription:generalCourse')}
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
                          <p className="text-muted-foreground dark:text-gray-400">{t('common:duration')}</p>
                          <p className="font-medium dark:text-white">
                            {format(new Date(subscription.start_date), 'MMM d, yyyy')} -
                            {subscription.end_date ? format(new Date(subscription.end_date), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground dark:text-gray-400">{t('subscription:completedSessions')}</p>
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
                          {t('common:viewDetails')}
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
            {t('subscription:upcomingLessons', { count: upcomingLessons.length })}
          </h2>
          <Alert className="mb-4 dark:bg-gray-800 dark:border-gray-700">
            <AlertDescription className="dark:text-gray-300">
              {t('subscription:showingLessons', { shown: Math.min(3, upcomingLessons.length), total: upcomingLessons.length })}
              {t('subscription:viewActiveToSeeAll')}
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
                          {subscription?.course_name || t('subscription:generalCourse')}
                        </h4>
                        {subscription?.teacher_name && (
                          <div className="mb-1">
                            {subscription?.teacher_id ? (
                              <Link
                                to={`/teacher/${subscription.teacher_id}`}
                                className="text-sm text-muted-foreground dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                              >
                                <User className="h-3 w-3" />
                                {t('subscription:teacher')}: {subscription.teacher_name}
                              </Link>
                            ) : (
                              <p className="text-sm text-muted-foreground dark:text-gray-400 inline-flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {t('subscription:teacher')}: {subscription.teacher_name}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <SessionTimeDisplay
                              date={getSessionDateTime(session)}
                              showDate={true}
                              showTime={false}
                              className=""
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              <SessionTimeDisplay
                                date={getSessionDateTime(session)}
                                showDate={false}
                                showTime={true}
                                className="inline"
                              />
                              {' '}• {session.duration_minutes || 60} {t('subscription:min')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSessionDetails(session.id, session, subscription)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('subscription:details')}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleJoinSession(session)}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            {t('subscription:join')}
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
                              {t('subscription:cancel')}
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-500">
                              <AlertCircle className="h-3 w-3" />
                              <span>{t('subscription:cannotCancel', { hours: cancellationNotice })}</span>
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
            <AlertDialogTitle className="dark:text-white">{t('subscription:cancelSession')}</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              {t('subscription:cancelSessionConfirm')}
              {t('subscription:cancelSessionWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600">
              {t('subscription:keepSession')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSession}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {t('subscription:yesCancelSession')}
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

      {/* Session Details Dialog */}
      <SessionDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        sessionId={selectedDetailsSessionId}
        sessionData={selectedDetailsSessionData}
      />
    </div>
  );
};

export default SubscriptionsPage;
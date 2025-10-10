import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  BookOpen,
  Brain,
  CheckSquare,
  TrendingUp,
  Target,
  Trophy,
  Zap,
  Mic,
  DollarSign,
  Clock,
  AlertCircle,
  Users,
  MapPin,
  Cake,
  Star,
  School
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserContext } from '@/App';
import { databaseService } from '@/services/firebase/database.service';
import { sessionDetailsService } from '@/services/firebase/sessionDetails.service';
import { todosService } from '@/services/firebase/todos.service';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const StudentDetail = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('overview');

  // Helper function to safely format dates
  const safeFormatDate = (date: any, formatString: string): string => {
    if (!date) return 'Date not available';
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return 'Invalid date';
      return format(parsedDate, formatString);
    } catch (error) {
      console.error('Date formatting error:', error, 'Date value:', date);
      return 'Invalid date';
    }
  };

  // Fetch student data from Firebase
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('No student ID');
      const studentData = await databaseService.getById('students', studentId);
      console.log('Student data:', studentData);
      return studentData;
    },
    enabled: !!studentId
  });

  // Fetch subscriptions from Supabase RPC with calculated end dates
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['student-subscriptions-detail', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase.rpc('get_student_subscriptions', {
        p_student_id: studentId
      });
      if (error) {
        console.error('Error fetching subscriptions:', error);
        return [];
      }
      console.log('Subscriptions:', data);

      // Calculate end dates from sessions for each subscription
      const subscriptionsWithCalculatedDates = await Promise.all(
        (data || []).map(async (sub: any) => {
          try {
            // Fetch sessions for this subscription, checking both field naming conventions
            const sessions = await databaseService.query('sessions', {
              where: [{ field: 'subscriptionId', operator: '==', value: sub.id }]
            });

            let allSessions = sessions || [];
            if (allSessions.length === 0) {
              const sessionsSnakeCase = await databaseService.query('sessions', {
                where: [{ field: 'subscription_id', operator: '==', value: sub.id }]
              });
              allSessions = sessionsSnakeCase || [];
            }

            let calculatedEndDate = sub.end_date;
            if (allSessions.length > 0) {
              // Sort sessions by date descending to get the last session
              const sortedSessions = allSessions.sort((a: any, b: any) => {
                const dateA = new Date(a.scheduled_date || a.scheduledDate || a.date);
                const dateB = new Date(b.scheduled_date || b.scheduledDate || b.date);
                return dateB.getTime() - dateA.getTime();
              });

              const lastSession = sortedSessions[0];
              if (lastSession && (lastSession.scheduled_date || lastSession.scheduledDate)) {
                calculatedEndDate = lastSession.scheduled_date || lastSession.scheduledDate;
                console.log(`📅 Calculated end date for subscription ${sub.id}:`, calculatedEndDate);
              }
            }

            return {
              ...sub,
              calculated_end_date: calculatedEndDate
            };
          } catch (error) {
            console.error(`Error fetching sessions for subscription ${sub.id}:`, error);
            return {
              ...sub,
              calculated_end_date: sub.end_date
            };
          }
        })
      );

      // Sort subscriptions by start_date (oldest first) so #1 is the first subscription
      const sortedSubscriptions = subscriptionsWithCalculatedDates.sort((a: any, b: any) => {
        const dateA = new Date(a.start_date || 0);
        const dateB = new Date(b.start_date || 0);
        return dateA.getTime() - dateB.getTime(); // Ascending order (oldest first)
      });

      return sortedSubscriptions;
    },
    enabled: !!studentId
  });

  // Fetch sessions from Firebase
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['student-sessions-detail', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      // Try both field naming conventions
      let allSessions = await databaseService.query('sessions', {
        where: [{ field: 'student_id', operator: '==', value: studentId }]
      });

      if (!allSessions || allSessions.length === 0) {
        allSessions = await databaseService.query('sessions', {
          where: [{ field: 'studentId', operator: '==', value: studentId }]
        });
      }

      // Sort by date
      const sortedSessions = (allSessions || []).sort((a: any, b: any) => {
        const dateA = new Date(a.scheduled_date || a.scheduledDate || a.date);
        const dateB = new Date(b.scheduled_date || b.scheduledDate || b.date);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('Sessions:', sortedSessions);
      return sortedSessions;
    },
    enabled: !!studentId
  });

  // Fetch payments/transactions
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['student-payments-detail', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      // Fetch transactions from Firebase
      const transactions = await databaseService.query('transactions', {
        where: [
          { field: 'student_id', operator: '==', value: studentId },
          { field: 'type', operator: '==', value: 'income' }
        ]
      });

      console.log('Payments:', transactions);
      return transactions || [];
    },
    enabled: !!studentId
  });

  // Fetch todos for this student
  const { data: todos = [], isLoading: todosLoading } = useQuery({
    queryKey: ['student-todos-detail', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const studentTodos = await todosService.getByFilters({
        student_ids: [studentId]
      });
      console.log('TODOs:', studentTodos);
      return studentTodos || [];
    },
    enabled: !!studentId
  });

  // Fetch session details (vocabulary, notes)
  const { data: sessionDetails = [], isLoading: detailsLoading } = useQuery({
    queryKey: ['student-session-details', studentId, sessions],
    queryFn: async () => {
      if (!studentId || sessions.length === 0) return [];

      const details = await Promise.all(
        sessions.slice(0, 10).map(async (session: any) => {
          try {
            const detail = await sessionDetailsService.getBySessionId(session.id);
            return { ...detail, sessionDate: session.scheduled_date || session.date };
          } catch (error) {
            console.error(`Error fetching details for session ${session.id}:`, error);
            return null;
          }
        })
      );
      return details.filter(d => d !== null);
    },
    enabled: !!studentId && sessions.length > 0
  });

  // Calculate statistics
  const stats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter((s: any) => s.status === 'completed' || s.status === 'attended').length,
    upcomingSessions: sessions.filter((s: any) => s.status === 'scheduled').length,
    missedSessions: sessions.filter((s: any) => s.status === 'absent' || s.status === 'missed').length,
    totalWords: sessionDetails.reduce((acc: number, detail: any) =>
      acc + (detail?.vocabulary?.length || 0), 0),
    completedTodos: todos.filter((t: any) => t.status === 'completed').length,
    totalTodos: todos.length,
    totalPaid: payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
    activeSubscriptions: subscriptions.filter((s: any) => s.status === 'active').length,
    totalSubscriptions: subscriptions.length
  };

  // Calculate attendance rate
  const attendanceRate = stats.totalSessions > 0
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
    : 0;

  // Calculate payment status
  const totalOwed = subscriptions.reduce((sum: number, sub: any) => sum + (sub.total_price || 0), 0);
  const paymentRate = totalOwed > 0 ? Math.round((stats.totalPaid / totalOwed) * 100) : 0;

  // Get payment status badge color
  const getPaymentStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartPractice = () => {
    navigate(`/student/${studentId}/practice?mode=mixed`);
  };

  const handleSpeakingPractice = () => {
    navigate(`/student/${studentId}/speaking`);
  };

  if (studentLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Student not found</p>
        <Button onClick={() => navigate('/students')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/students')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Student Detail</h1>
            <p className="text-muted-foreground">Comprehensive view of student progress and learning</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSpeakingPractice}>
            <Mic className="mr-2 h-4 w-4" />
            Speaking Practice
          </Button>
          <Button onClick={handleStartPractice}>
            <Zap className="mr-2 h-4 w-4" />
            Vocabulary Practice
          </Button>
        </div>
      </div>

      {/* Student Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                  {student.firstName?.[0]}{student.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">{student.firstName} {student.lastName}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline">{student.ageGroup || 'Adult'}</Badge>
                    <Badge variant="outline">{student.lessonType || 'Individual'}</Badge>
                    <Badge variant="outline">{student.level || 'B1'}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  {student.email && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{student.email}</span>
                    </div>
                  )}
                  {student.phone && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{student.countryCode || ''}{student.phone}</span>
                    </div>
                  )}
                  {student.courseName && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <School className="h-4 w-4" />
                      <span>{student.courseName}</span>
                    </div>
                  )}
                  {student.birthday && safeFormatDate(student.birthday, 'MMM d, yyyy') !== 'Invalid date' && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Cake className="h-4 w-4" />
                      <span>{safeFormatDate(student.birthday, 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>

                {/* Parent Info if exists */}
                {(student.parentInfo || student.parent_info) && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-1 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Parent/Guardian
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {(student.parentInfo?.name || student.parent_info?.name) && (
                        <span className="block">{student.parentInfo?.name || student.parent_info?.name}</span>
                      )}
                      {(student.parentInfo?.phone || student.parent_info?.phone) && (
                        <span className="block">{student.parentInfo?.phone || student.parent_info?.phone}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <Badge className={cn("mb-2", getPaymentStatusColor(student.paymentStatus || student.payment_status))}>
                {student.paymentStatus || student.payment_status || 'Pending'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Total Sessions</span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.completedSessions} completed • {stats.upcomingSessions} upcoming
            </div>
            <Progress value={attendanceRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Payment Status</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(stats.totalPaid)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              of {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(totalOwed)} total
            </div>
            <Progress value={paymentRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Subscriptions</span>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <div className="text-xs text-muted-foreground mt-1">
              active of {stats.totalSubscriptions} total
            </div>
            {stats.activeSubscriptions > 0 && (
              <Badge variant="outline" className="mt-2 text-xs">Active</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Homework</span>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.completedTodos}/{stats.totalTodos}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              tasks completed
            </div>
            <Progress
              value={stats.totalTodos > 0 ? (stats.completedTodos / stats.totalTodos) * 100 : 0}
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="todos" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            TODOs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Learning Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Session Attendance</span>
                    <span>{attendanceRate}%</span>
                  </div>
                  <Progress value={attendanceRate} />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Homework Completion</span>
                    <span>{stats.totalTodos > 0 ? Math.round((stats.completedTodos / stats.totalTodos) * 100) : 0}%</span>
                  </div>
                  <Progress value={stats.totalTodos > 0 ? (stats.completedTodos / stats.totalTodos) * 100 : 0} />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Payment Status</span>
                    <span>{paymentRate}%</span>
                  </div>
                  <Progress value={paymentRate} />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="space-y-2">
                    {sessions.slice(0, 5).map((session: any, index: number) => {
                      const sessionDate = session.scheduled_date || session.scheduledDate || session.date;
                      const isValidDate = sessionDate && !isNaN(new Date(sessionDate).getTime());

                      return (
                        <div key={session.id || index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {safeFormatDate(sessionDate, 'MMM d, yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {session.scheduled_time || session.scheduledTime || 'No time set'}
                              </p>
                            </div>
                          </div>
                          <Badge variant={session.status === 'completed' ? 'default' : 'outline'}>
                            {session.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No sessions yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pending TODOs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Pending Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todosLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : todos.filter((t: any) => t.status !== 'completed').length > 0 ? (
                <div className="space-y-2">
                  {todos.filter((t: any) => t.status !== 'completed').slice(0, 5).map((todo: any) => (
                    <div key={todo.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <CheckSquare className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="flex-1">
                        <p className="text-sm">{todo.task || 'Untitled task'}</p>
                        {todo.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {safeFormatDate(todo.due_date, 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{todo.priority || 'Normal'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Sessions</CardTitle>
              <CardDescription>Sessions grouped by subscription</CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading || subscriptionsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-6">
                  {/* Group sessions by subscription */}
                  {(() => {
                    // First, group sessions by subscriptionId
                    const sessionsBySubscription = sessions.reduce((acc: any, session: any) => {
                      const subId = session.subscriptionId || session.subscription_id || 'unassigned';
                      if (!acc[subId]) {
                        acc[subId] = [];
                      }
                      acc[subId].push(session);
                      return acc;
                    }, {});

                    // Sort subscriptions to show active ones first, then by date
                    const sortedSubIds = Object.keys(sessionsBySubscription).sort((a, b) => {
                      if (a === 'unassigned') return 1;
                      if (b === 'unassigned') return -1;

                      const subA = subscriptions.find((s: any) => s.id === a);
                      const subB = subscriptions.find((s: any) => s.id === b);

                      if (!subA) return 1;
                      if (!subB) return -1;

                      // Sort by start date (newest first)
                      return new Date(subB.start_date).getTime() - new Date(subA.start_date).getTime();
                    });

                    return sortedSubIds.map((subId, subIndex) => {
                      const subscription = subscriptions.find((s: any) => s.id === subId);
                      const subSessions = sessionsBySubscription[subId].sort((a: any, b: any) => {
                        const dateA = new Date(a.scheduled_date || a.scheduledDate || a.date || 0);
                        const dateB = new Date(b.scheduled_date || b.scheduledDate || b.date || 0);
                        return dateB.getTime() - dateA.getTime(); // Most recent first
                      });

                      return (
                        <div key={subId} className="space-y-2">
                          {/* Subscription Header */}
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {subscription ? (
                                  <>
                                    Subscription #{subIndex + 1} - {subscription.session_count} Sessions
                                    <span className="text-sm text-muted-foreground ml-2">
                                      ({safeFormatDate(subscription.start_date, 'MMM d')} - {safeFormatDate(subscription.calculated_end_date || subscription.end_date, 'MMM d, yyyy')})
                                    </span>
                                  </>
                                ) : (
                                  'Unassigned Sessions'
                                )}
                              </span>
                            </div>
                            {subscription && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {subSessions.filter((s: any) => s.status === 'completed' || s.status === 'attended').length}/{subscription.session_count} completed
                                </span>
                                <Badge
                                  variant={subscription.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {subscription.status}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Sessions for this subscription */}
                          <div className="space-y-2 pl-4">
                            {subSessions.map((session: any, index: number) => {
                              const sessionDate = session.scheduled_date || session.scheduledDate || session.date;

                              return (
                                <Card key={session.id || `${subId}-${index}`} className="border-l-4 border-l-primary/20">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium">
                                            {safeFormatDate(sessionDate, 'EEEE, MMMM d, yyyy')}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          <span>Time: {session.scheduled_time || session.scheduledTime || 'Not set'}</span>
                                          {session.duration && <span>Duration: {session.duration} min</span>}
                                          {(session.teacher_name || session.teacherName) && (
                                            <span>Teacher: {session.teacher_name || session.teacherName}</span>
                                          )}
                                        </div>
                                        {session.notes && (
                                          <p className="text-sm mt-2">{session.notes}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={
                                          session.status === 'completed' || session.status === 'attended' ? 'default' :
                                          session.status === 'scheduled' ? 'secondary' :
                                          session.status === 'cancelled' ? 'destructive' :
                                          'outline'
                                        }>
                                          {session.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No sessions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>Student subscription history and details</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : subscriptions.length > 0 ? (
                <div className="space-y-4">
                  {subscriptions.map((subscription: any, index: number) => (
                    <Card key={subscription.id || index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                Subscription #{index + 1} - {subscription.session_count} Sessions
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Start Date</p>
                                <p className="font-medium">
                                  {safeFormatDate(subscription.start_date, 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">End Date</p>
                                <p className="font-medium">
                                  {safeFormatDate(subscription.calculated_end_date || subscription.end_date, 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Price</p>
                                <p className="font-medium">
                                  {subscription.currency} {subscription.total_price}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Progress</p>
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={(subscription.sessions_completed || 0) / (subscription.session_count || 1) * 100}
                                    className="h-2 flex-1"
                                  />
                                  <span className="text-xs font-medium">
                                    {subscription.sessions_completed || 0}/{subscription.session_count}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {subscription.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{subscription.notes}</p>
                            )}
                          </div>
                          <Badge
                            variant={subscription.status === 'active' ? 'default' : 'secondary'}
                            className="ml-4"
                          >
                            {subscription.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No subscriptions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Complete payment history and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : payments.length > 0 ? (
                <div className="space-y-2">
                  {payments.map((payment: any, index: number) => (
                    <Card key={payment.id || index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {payment.currency || 'RUB'} {payment.amount}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {safeFormatDate(payment.transaction_date || payment.created_at, 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {payment.payment_method || 'Cash'}
                            </Badge>
                            <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                              {payment.status || 'Completed'}
                            </Badge>
                          </div>
                        </div>
                        {payment.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{payment.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payments found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TODOs Tab */}
        <TabsContent value="todos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks & Homework</CardTitle>
              <CardDescription>All assigned tasks and homework</CardDescription>
            </CardHeader>
            <CardContent>
              {todosLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : todos.length > 0 ? (
                <div className="space-y-2">
                  {todos.map((todo: any) => (
                    <Card key={todo.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <CheckSquare
                              className={cn(
                                "h-5 w-5 mt-1",
                                todo.status === 'completed' ? "text-green-600" : "text-muted-foreground"
                              )}
                            />
                            <div className="space-y-1 flex-1">
                              <p className={cn(
                                "font-medium",
                                todo.status === 'completed' && "line-through text-muted-foreground"
                              )}>
                                {todo.task || 'Untitled task'}
                              </p>
                              {todo.description && (
                                <p className="text-sm text-muted-foreground">{todo.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {todo.due_date && (
                                  <span>Due: {safeFormatDate(todo.due_date, 'MMM d, yyyy')}</span>
                                )}
                                {todo.created_at && (
                                  <span>Created: {safeFormatDate(todo.created_at, 'MMM d, yyyy')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              todo.priority === 'high' ? 'destructive' :
                              todo.priority === 'medium' ? 'default' :
                              'secondary'
                            }>
                              {todo.priority || 'normal'}
                            </Badge>
                            <Badge variant={todo.status === 'completed' ? 'default' : 'outline'}>
                              {todo.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tasks assigned</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentDetail;
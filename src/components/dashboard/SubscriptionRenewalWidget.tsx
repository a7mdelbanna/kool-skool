import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Calendar, RefreshCw, User } from 'lucide-react';
import { databaseService } from '@/services/firebase/database.service';
import { format, differenceInDays, addDays, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SubscriptionData {
  id: string;
  student_id: string;
  student_name: string;
  start_date: string;
  end_date: string;
  session_count: number;
  sessions_completed: number;
  status: string;
  teacher_name?: string;
  teacher_id?: string;
}

const SubscriptionRenewalWidget: React.FC = () => {
  const navigate = useNavigate();

  const { data: expiringSubscriptions, isLoading } = useQuery({
    queryKey: ['expiring-subscriptions-firebase'],
    queryFn: async () => {
      console.log('🔄 Fetching subscriptions for renewal widget...');

      // Get all active students from Firebase
      const students = await databaseService.getAll('students');
      const activeStudents = students.filter((s: any) => s.status === 'active');
      console.log(`Found ${activeStudents.length} active students`);

      const subscriptionsToRenew: SubscriptionData[] = [];

      // Define date range: 1 month past to 1 month future
      const today = new Date();
      const oneMonthAgo = subDays(today, 30);
      const oneMonthFromNow = addDays(today, 30);

      console.log(`Date range: ${oneMonthAgo.toISOString()} to ${oneMonthFromNow.toISOString()}`);

      // Fetch subscriptions for each student from Firebase
      for (const student of activeStudents) {
        try {
          // Try both field naming conventions
          let subscriptions = await databaseService.query('subscriptions', {
            where: [{ field: 'student_id', operator: '==', value: student.id }]
          });

          if (subscriptions.length === 0) {
            subscriptions = await databaseService.query('subscriptions', {
              where: [{ field: 'studentId', operator: '==', value: student.id }]
            });
          }

          console.log(`Student ${student.firstName} ${student.lastName} (${student.id}): ${subscriptions.length} subscriptions found`);

          if (subscriptions.length === 0) continue;

          // Log the first subscription to see its structure
          console.log('Subscription data:', subscriptions[0]);

          // Sort subscriptions by created_at or start_date to get the most recent
          subscriptions.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || a.start_date || 0);
            const dateB = new Date(b.created_at || b.start_date || 0);
            return dateB.getTime() - dateA.getTime(); // Most recent first
          });

          // Get the most recent subscription
          const mostRecent = subscriptions[0];

          // Check if subscription is in the date range (past month to next month)
          const endDateStr = mostRecent.end_date || mostRecent.endDate;
          console.log(`Most recent subscription end_date: ${endDateStr}, is_renewed: ${mostRecent.is_renewed}`);

          if (!endDateStr) {
            console.log('⚠️ Subscription has no end_date field!');
            continue;
          }

          const endDate = new Date(endDateStr);

          if (isNaN(endDate.getTime())) {
            console.log(`⚠️ Invalid end_date: ${endDateStr}`);
            continue;
          }

          console.log(`Checking if ${endDate.toISOString()} is between ${oneMonthAgo.toISOString()} and ${oneMonthFromNow.toISOString()}`);

          if (endDate >= oneMonthAgo && endDate <= oneMonthFromNow && !mostRecent.is_renewed) {
            console.log(`✅ Found expiring subscription for ${student.firstName} ${student.lastName}, ends: ${endDate.toISOString()}`);

            // Get teacher name if available
            let teacherName = 'No Teacher Assigned';
            if (mostRecent.teacher_id || mostRecent.teacherId) {
              try {
                const teacher = await databaseService.getById('teachers', mostRecent.teacher_id || mostRecent.teacherId);
                teacherName = teacher?.name || 'No Teacher Assigned';
              } catch (error) {
                console.log('Could not fetch teacher');
              }
            }

            // Count completed sessions for this subscription
            let completedSessions = 0;
            try {
              const sessions = await databaseService.query('sessions', {
                where: [
                  { field: 'subscriptionId', operator: '==', value: mostRecent.id }
                ]
              });

              completedSessions = sessions.filter((s: any) =>
                s.status === 'completed' || s.status === 'attended'
              ).length;
            } catch (error) {
              console.log('Could not fetch sessions');
            }

            subscriptionsToRenew.push({
              id: mostRecent.id,
              student_id: student.id,
              student_name: `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim(),
              start_date: mostRecent.start_date || mostRecent.startDate,
              end_date: mostRecent.end_date || mostRecent.endDate,
              session_count: mostRecent.session_count || mostRecent.sessionCount || 0,
              sessions_completed: completedSessions,
              status: endDate < today ? 'expired' : 'expiring',
              teacher_name: teacherName,
              teacher_id: mostRecent.teacher_id || mostRecent.teacherId
            });
          }
        } catch (error) {
          console.error(`Error fetching subscriptions for student ${student.id}:`, error);
        }
      }

      // Sort by end date (most urgent first)
      subscriptionsToRenew.sort((a, b) => {
        return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
      });

      return subscriptionsToRenew;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const getDaysRemaining = (endDate: string) => {
    const daysLeft = differenceInDays(new Date(endDate), new Date());
    return daysLeft;
  };

  const getStatusBadge = (endDate: string) => {
    const days = getDaysRemaining(endDate);

    if (days < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (days === 0) {
      return <Badge variant="destructive">Expires Today</Badge>;
    } else if (days <= 3) {
      return <Badge variant="destructive">Expires in {days} days</Badge>;
    } else {
      return <Badge variant="outline">Expires in {days} days</Badge>;
    }
  };

  const handleRenew = (studentId: string, studentName: string) => {
    // Navigate to student detail page with renewal flag
    navigate(`/student/${studentId}?action=renew`);
  };

  const handleViewStudent = (studentId: string) => {
    navigate(`/student/${studentId}`);
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Subscription Renewals
          </CardTitle>
          <CardDescription>Loading subscriptions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Categorize subscriptions
  const expiredSubscriptions = expiringSubscriptions?.filter(sub => getDaysRemaining(sub.end_date) < 0) || [];
  const urgentRenewals = expiringSubscriptions?.filter(sub => {
    const days = getDaysRemaining(sub.end_date);
    return days >= 0 && days <= 7;
  }) || [];
  const upcomingRenewals = expiringSubscriptions?.filter(sub => getDaysRemaining(sub.end_date) > 7) || [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Subscription Renewals
          {(expiredSubscriptions.length > 0 || urgentRenewals.length > 0) && (
            <Badge variant="destructive" className="ml-2">
              {expiredSubscriptions.length + urgentRenewals.length} Need Action
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Subscriptions ending from past month to next month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {expiringSubscriptions && expiringSubscriptions.length > 0 ? (
            <div className="space-y-3">
              {/* Expired Subscriptions */}
              {expiredSubscriptions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Expired (Past Month)
                  </div>
                  {expiredSubscriptions.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="p-3 rounded-lg border-2 border-destructive/50 bg-destructive/5 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <button
                              onClick={() => handleViewStudent(subscription.student_id)}
                              className="font-medium hover:underline text-left"
                            >
                              {subscription.student_name}
                            </button>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expired: {format(new Date(subscription.end_date), 'MMM d, yyyy')}
                            </span>
                            {subscription.teacher_name && (
                              <span>Teacher: {subscription.teacher_name}</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Progress: {subscription.sessions_completed}/{subscription.session_count} sessions
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(subscription.end_date)}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRenew(subscription.student_id, subscription.student_name)}
                            className="flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Renew Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Urgent Renewals (expiring in 7 days) */}
              {urgentRenewals.length > 0 && (
                <div className="space-y-3">
                  {expiredSubscriptions.length > 0 && <div className="mt-4" />}
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    Expiring This Week
                  </div>
                  {urgentRenewals.map((subscription) => (
                    <div
                      key={subscription.id}
                      className={cn(
                        "p-3 rounded-lg border-2 space-y-2",
                        getDaysRemaining(subscription.end_date) < 0
                          ? "border-destructive/50 bg-destructive/5"
                          : "border-destructive/30 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <button
                              onClick={() => handleViewStudent(subscription.student_id)}
                              className="font-medium hover:underline text-left"
                            >
                              {subscription.student_name}
                            </button>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Ends: {format(new Date(subscription.end_date), 'MMM d, yyyy')}
                            </span>
                            {subscription.teacher_name && (
                              <span>Teacher: {subscription.teacher_name}</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Progress: {subscription.sessions_completed}/{subscription.session_count} sessions
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(subscription.end_date)}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRenew(subscription.student_id, subscription.student_name)}
                            className="flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Renew
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming Renewals (expiring in next month) */}
              {upcomingRenewals.length > 0 && (
                <div className="space-y-3">
                  {(expiredSubscriptions.length > 0 || urgentRenewals.length > 0) && <div className="mt-4" />}
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Expiring This Month
                  </div>
                  {upcomingRenewals.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="p-3 rounded-lg border space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <button
                              onClick={() => handleViewStudent(subscription.student_id)}
                              className="font-medium hover:underline text-left"
                            >
                              {subscription.student_name}
                            </button>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Ends: {format(new Date(subscription.end_date), 'MMM d, yyyy')}
                            </span>
                            {subscription.teacher_name && (
                              <span>Teacher: {subscription.teacher_name}</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Progress: {subscription.sessions_completed}/{subscription.session_count} sessions
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(subscription.end_date)}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRenew(subscription.student_id, subscription.student_name)}
                            className="flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Renew
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <RefreshCw className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No subscriptions need renewal</p>
              <p className="text-xs text-muted-foreground mt-1">All subscriptions are up to date</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SubscriptionRenewalWidget;
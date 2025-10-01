/**
 * UrgentActionsWidget - Dashboard component that displays urgent/overdue items requiring immediate attention
 *
 * Features:
 * - Fetches TODOs from Firebase using todosService.getUrgentTodos()
 * - Shows urgent/overdue TODOs with proper categorization (overdue vs due soon)
 * - Filters TODOs where status is not 'completed' or 'cancelled'
 * - Includes TODOs that are overdue OR due within 7 days with 'high' or 'urgent' priority
 * - Displays "All caught up!" when no urgent items exist
 * - Includes counts and proper priority badges
 * - Allows navigation to TODOs page when items are clicked
 * - Uses glass-card styling consistent with other dashboard widgets
 * - Also includes other urgent actions like payments, attendance, subscriptions, etc.
 */
import React, { useContext, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  UserX,
  Calendar,
  Bell,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Cake,
  BookX,
  ClipboardX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import { databaseService } from '@/services/firebase/database.service';
import { todosService } from '@/services/firebase/todos.service';
import { format, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UrgentAction {
  id: string;
  type: 'payment' | 'attendance' | 'subscription' | 'birthday' | 'todo' | 'lesson';
  priority: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  amount?: number;
  dueDate?: Date;
  icon: React.ElementType;
  color: string;
  action: () => void;
  actionLabel: string;
}

const UrgentActionsWidget: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [urgentActions, setUrgentActions] = useState<UrgentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.schoolId) {
      fetchUrgentActions();
    }
  }, [user?.schoolId]);

  const fetchUrgentActions = async () => {
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      const actions: UrgentAction[] = [];
      const now = new Date();

      // Batch load ALL students for later lookups (used by TODOs)
      // This follows the documented pattern from Todos.tsx to avoid N+1 queries
      const allStudents = await databaseService.getBySchoolId('students', user.schoolId);
      const studentMap = new Map();
      allStudents.forEach((student: any) => {
        studentMap.set(student.id || student.studentId, {
          firstName: student.firstName || student.first_name || '',
          lastName: student.lastName || student.last_name || '',
          userId: student.userId || student.user_id
        });
      });

      // 1. Fetch overdue payments
      const payments = await databaseService.query('payments', {
        where: [
          { field: 'school_id', operator: '==', value: user.schoolId },
          { field: 'status', operator: '==', value: 'pending' }
        ]
      });

      if (payments) {
        payments.forEach((payment: any) => {
          const dueDate = new Date(payment.due_date || payment.payment_date);
          if (dueDate < now) {
            const daysOverdue = differenceInDays(now, dueDate);
            actions.push({
              id: `payment-${payment.id}`,
              type: 'payment',
              priority: daysOverdue > 7 ? 'critical' : 'high',
              title: 'Overdue Payment',
              description: `${payment.student_name} - ${daysOverdue} days overdue`,
              amount: payment.amount,
              dueDate,
              icon: DollarSign,
              color: 'text-red-500',
              action: () => navigate('/payments'),
              actionLabel: 'Send Reminder'
            });
          }
        });
      }

      // 2. Fetch pending attendance
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const sessions = await databaseService.query('sessions', {
        where: [
          { field: 'schoolId', operator: '==', value: user.schoolId },
          { field: 'status', operator: '==', value: 'scheduled' }
        ]
      });

      if (sessions) {
        const pastSessions = sessions.filter((session: any) => {
          const sessionDate = new Date(session.scheduled_date);
          return sessionDate < now && sessionDate >= todayStart;
        });

        if (pastSessions.length > 0) {
          actions.push({
            id: 'attendance-pending',
            type: 'attendance',
            priority: 'high',
            title: 'Pending Attendance',
            description: `${pastSessions.length} completed sessions need attendance marking`,
            icon: ClipboardX,
            color: 'text-orange-500',
            action: () => navigate('/attendance'),
            actionLabel: 'Mark Attendance'
          });
        }
      }

      // 3. Fetch expiring subscriptions (next 7 days)
      const subscriptions = await databaseService.query('subscriptions', {
        where: [
          { field: 'schoolId', operator: '==', value: user.schoolId },
          { field: 'status', operator: '==', value: 'active' }
        ]
      });

      if (subscriptions) {
        subscriptions.forEach((sub: any) => {
          if (sub.end_date) {
            const endDate = new Date(sub.end_date);
            const daysUntilExpiry = differenceInDays(endDate, now);

            if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
              actions.push({
                id: `subscription-${sub.id}`,
                type: 'subscription',
                priority: daysUntilExpiry <= 3 ? 'high' : 'medium',
                title: 'Subscription Expiring',
                description: `${sub.student_name || 'Student'} - Expires in ${daysUntilExpiry} days`,
                dueDate: endDate,
                icon: Clock,
                color: 'text-yellow-500',
                action: () => navigate('/students'),
                actionLabel: 'Renew'
              });
            }
          }
        });
      }

      // 4. Fetch birthdays
      const students = await databaseService.query('students', {
        where: [{ field: 'schoolId', operator: '==', value: user.schoolId }]
      });

      if (students) {
        for (const student of students) {
          const userDoc = await databaseService.getById('users', student.userId || student.user_id);
          if (userDoc?.birthdate) {
            const birthDate = new Date(userDoc.birthdate);
            const thisYearBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());

            if (isToday(thisYearBirthday)) {
              actions.push({
                id: `birthday-${student.id}`,
                type: 'birthday',
                priority: 'medium',
                title: "Birthday Today!",
                description: `${userDoc.firstName} ${userDoc.lastName} is celebrating today`,
                icon: Cake,
                color: 'text-pink-500',
                action: () => navigate('/birthdays'),
                actionLabel: 'Send Wishes'
              });
            } else if (isTomorrow(thisYearBirthday)) {
              actions.push({
                id: `birthday-tomorrow-${student.id}`,
                type: 'birthday',
                priority: 'medium',
                title: "Birthday Tomorrow",
                description: `${userDoc.firstName} ${userDoc.lastName}'s birthday is tomorrow`,
                icon: Cake,
                color: 'text-pink-400',
                action: () => navigate('/birthdays'),
                actionLabel: 'Prepare'
              });
            }
          }
        }
      }

      // 5. Fetch TODOs using the same approach as /todos page
      // Use getBySchoolId instead of getUrgentTodos to avoid composite index requirement
      const allTodos = await todosService.getBySchoolId(user.schoolId);
      console.log('📋 All TODOs fetched:', allTodos.length);

      // Filter for urgent TODOs client-side (same logic as getUrgentTodos but without index)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const urgentTodos = allTodos.filter(todo => {
        // Only include pending/in_progress TODOs
        if (todo.status !== 'pending' && todo.status !== 'in_progress') {
          return false;
        }

        const dueDate = new Date(todo.due_date);

        // Include if overdue
        if (dueDate < now) {
          return true;
        }

        // Include if due within 7 days AND high/urgent priority
        if (dueDate <= nextWeek && (todo.priority === 'high' || todo.priority === 'urgent')) {
          return true;
        }

        return false;
      });

      console.log('📋 Urgent TODOs filtered:', urgentTodos.length);

      urgentTodos.forEach(todo => {
        const dueDate = new Date(todo.due_date);
        const isOverdue = dueDate < now;
        const daysOverdue = isOverdue ? differenceInDays(now, dueDate) : 0;
        const daysToDue = isOverdue ? 0 : differenceInDays(dueDate, now);

        // Find student name using the documented pattern (two-tier lookup)
        // STEP 1: Try to find in the studentMap (FAST)
        const studentInfo = studentMap.get(todo.student_id);
        const studentName = studentInfo
          ? `${studentInfo.firstName} ${studentInfo.lastName}`.trim()
          : null;

        // Build description with student name
        let description = studentName ? `${studentName} - ${todo.title}` : todo.title;
        if (isOverdue) {
          description += ` - ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
        } else if (daysToDue === 0) {
          description += ' - Due today';
        } else {
          description += ` - Due in ${daysToDue} day${daysToDue > 1 ? 's' : ''}`;
        }

        actions.push({
          id: `todo-${todo.id}`,
          type: 'todo',
          priority: isOverdue ? 'critical' : todo.priority === 'urgent' ? 'critical' : 'high',
          title: isOverdue ? 'Overdue TODO' : 'Urgent TODO',
          description,
          dueDate: todo.due_date,
          icon: isOverdue ? XCircle : AlertCircle,
          color: isOverdue ? 'text-red-500' : 'text-orange-500',
          action: () => navigate('/todos'),
          actionLabel: isOverdue ? 'Complete' : 'View'
        });
      });

      // Note: Unconfirmed lessons moved to PastSessionsWidget

      // Sort by priority and date
      actions.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      });

      setUrgentActions(actions.slice(0, 10)); // Show top 10 urgent items
    } catch (error) {
      console.error('Error fetching urgent actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: UrgentAction) => {
    // For now, navigate to the relevant page
    // In the future, we can add quick action modals
    action.action();
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      critical: 'bg-red-500/10 text-red-500 border-red-500/20',
      high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    };
    return colors[priority as keyof typeof colors];
  };

  if (loading) {
    return (
      <Card className="glass-card backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Urgent Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card backdrop-blur-xl border-white/10 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-base">Urgent Actions</span>
          </CardTitle>
          <Badge variant="secondary" className="bg-white/10">
            {urgentActions.length} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {urgentActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500/50 mb-3" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No urgent actions required</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-3">
              {urgentActions.map((action) => (
                <div
                  key={action.id}
                  className={cn(
                    "group p-3 rounded-lg border transition-all duration-200",
                    "bg-white/[0.02] border-white/5",
                    "hover:bg-white/[0.05] hover:border-white/10",
                    "cursor-pointer"
                  )}
                  onClick={() => handleAction(action)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      action.priority === 'critical'
                        ? 'bg-red-500/10'
                        : action.priority === 'high'
                        ? 'bg-orange-500/10'
                        : 'bg-yellow-500/10'
                    )}>
                      <action.icon className={cn("h-4 w-4", action.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {action.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {action.description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] shrink-0", getPriorityBadge(action.priority))}
                        >
                          {action.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {action.amount && (
                          <span className="text-sm font-semibold text-foreground">
                            ${action.amount}
                          </span>
                        )}
                        {action.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Due: {format(action.dueDate, 'MMM d')}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs ml-auto group-hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(action);
                          }}
                        >
                          {action.actionLabel}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
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

export default UrgentActionsWidget;
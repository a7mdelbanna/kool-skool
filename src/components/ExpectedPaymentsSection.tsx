
import React, { useState, useMemo } from 'react';
import { Calendar, DollarSign, User, CalendarRange, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { databaseService } from '@/services/firebase/database.service';
import { format, addDays, addWeeks, addMonths, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { formatInUserTimezone } from '@/utils/timezone';

interface ExpectedPayment {
  student_id: string;
  student_name: string;
  subscription_id: string;
  next_payment_date: string;
  next_payment_amount: number;
  currency?: string;
  subscription_name?: string;
  last_session_date?: string;
}

interface ExpectedPaymentsSectionProps {
  schoolId: string;
}

type FilterPeriod = 'today' | 'week' | 'month' | 'thisMonth' | 'nextMonth' | 'custom' | 'all';

const ExpectedPaymentsSection: React.FC<ExpectedPaymentsSectionProps> = ({ schoolId }) => {
  // Get user's timezone (Cairo)
  const getUserTimezone = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.timezone || 'Africa/Cairo';
      } catch {
        return 'Africa/Cairo';
      }
    }
    return 'Africa/Cairo';
  };

  const userTimezone = getUserTimezone();
  
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: toZonedTime(new Date(), userTimezone),
    end: addMonths(toZonedTime(new Date(), userTimezone), 1),
  });

  // Fetch expected payments based on subscription completion
  const { data: expectedPayments = [], isLoading, error } = useQuery({
    queryKey: ['expected-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      console.log('🔄 Fetching expected payments for school:', schoolId);
      
      try {
        // Fetch active subscriptions - try both field name formats
        let subscriptions = await databaseService.query('subscriptions', {
          where: [
            { field: 'schoolId', operator: '==', value: schoolId },
            { field: 'status', operator: '==', value: 'active' }
          ]
        });
        
        // If no results, try snake_case format
        if (!subscriptions || subscriptions.length === 0) {
          subscriptions = await databaseService.query('subscriptions', {
            where: [
              { field: 'school_id', operator: '==', value: schoolId },
              { field: 'status', operator: '==', value: 'active' }
            ]
          });
        }

        console.log('📋 Found subscriptions:', subscriptions?.length || 0);

        if (!subscriptions || subscriptions.length === 0) {
          console.log('No active subscriptions found');
          return [];
        }

      // Fetch all students and users for name mapping (handle both field formats)
      const studentIds = [...new Set(subscriptions.map((s: any) => s.studentId || s.student_id).filter(Boolean))];
      console.log('🔍 Fetching students for IDs:', studentIds);
      
      const students = await Promise.all(
        studentIds.map(async (id) => {
          try {
            const student = await databaseService.getById('students', id);
            console.log('👤 Found student:', student?.id, student);
            return student;
          } catch (error) {
            console.error('Failed to fetch student:', id, error);
            return null;
          }
        })
      );
      
      // Filter students array to remove nulls
      const validStudents = students.filter(s => s !== null);
      console.log('✅ Valid students found:', validStudents.length);
      
      // Filter subscriptions to only include those with existing students
      const validSubscriptions = subscriptions.filter((subscription: any) => {
        const studentId = subscription.studentId || subscription.student_id;
        if (!studentId) {
          console.log('⚠️ Subscription has no student ID:', subscription.id);
          return false;
        }
        const studentExists = validStudents.some(s => s?.id === studentId);
        if (!studentExists) {
          console.log('⚠️ Filtering out subscription for non-existent student:', studentId);
        }
        return studentExists;
      });
      
      console.log('📋 Valid subscriptions after filtering:', validSubscriptions.length);
      
      if (validSubscriptions.length === 0) {
        console.log('No valid subscriptions with existing students');
        return [];
      }
      
      // Use the filtered lists for the rest of the function

      const userIds = validStudents.filter(s => s).map(s => s.userId || s.user_id).filter(Boolean);
      console.log('🔍 Fetching users for IDs:', userIds);
      
      const users = await Promise.all(
        userIds.map(async (userId: string) => {
          try {
            const user = await databaseService.getById('users', userId);
            console.log('👤 Found user:', userId, user);
            return user;
          } catch (error) {
            console.error('Failed to fetch user:', userId, error);
            return null;
          }
        })
      );

      // Batch fetch all sessions for all subscriptions
      console.log('⏳ Fetching sessions for', validSubscriptions.length, 'subscriptions...');
      
      const sessionsBySubscription = await Promise.all(
        validSubscriptions.map(async (subscription: any) => {
          try {
            // Fetch all sessions for this subscription - try both field formats
            let allSessions = await databaseService.query('sessions', {
              where: [
                { field: 'subscriptionId', operator: '==', value: subscription.id }
              ]
            });
            
            // If no results, try snake_case format
            if (!allSessions || allSessions.length === 0) {
              allSessions = await databaseService.query('sessions', {
                where: [
                  { field: 'subscription_id', operator: '==', value: subscription.id }
                ]
              });
            }
            
            // Filter out cancelled sessions client-side
            const sessions = allSessions ? allSessions.filter((s: any) => s.status !== 'cancelled') : [];
            
            return { subscription, sessions };
          } catch (error) {
            console.error('Error fetching sessions for subscription:', subscription.id, error);
            return { subscription, sessions: [] };
          }
        })
      );
      
      console.log('✅ Sessions fetched for all subscriptions');
      
      // Calculate expected payments for each subscription
      const expectedPaymentsData: ExpectedPayment[] = [];
      
      for (const { subscription, sessions } of sessionsBySubscription) {
        // Get student and user info for name (handle both field formats)
        const studentId = subscription.studentId || subscription.student_id;
        const student = validStudents.find(s => s?.id === studentId);
        
        // Skip subscriptions for non-existent students
        if (studentId && !student) {
          console.log(`⚠️ Skipping expected payment for non-existent student: ${studentId}`);
          continue;
        }
        
        let studentName = 'Unknown Student';
        
        // First try to get name from user data
        if (student) {
          const userId = student.userId || student.user_id;
          const user = userId ? users.find(u => u?.id === userId) : null;
          
          if (user) {
            studentName = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim();
          } 
          // If no user found, try to get name directly from student
          else if (student.firstName || student.first_name || student.lastName || student.last_name) {
            studentName = `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim();
          }
        }
        
        console.log(`📝 Student name for ${studentId}: ${studentName}`);
        
        // Get subscription schedule to determine payment day
        const schedule = subscription.schedule;
        
        if (!schedule || (Array.isArray(schedule) && schedule.length === 0)) {
          continue;
        }
        
        // Calculate payment amount (handle all possible field names)
        const paymentAmount = subscription.totalPrice || subscription.total_price || subscription.price || 0;
        
        // Check if subscription has no sessions or no valid sessions (meaning no payments yet)
        if (!sessions || sessions.length === 0) {
          console.log(`⚠️ No sessions found for subscription ${subscription.id} - setting payment date to today`);
          
          // If no sessions/payments yet, expected payment is today (in Cairo timezone)
          const today = toZonedTime(new Date(), userTimezone);
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          
          expectedPaymentsData.push({
            student_id: studentId,
            student_name: studentName,
            subscription_id: subscription.id,
            next_payment_date: todayStr,
            next_payment_amount: paymentAmount,
            currency: subscription.currency || 'RUB',
            subscription_name: subscription.courseName || subscription.course_name || 'Subscription',
            last_session_date: 'No sessions yet'
          });
          
          continue;
        }

        // Filter out sessions with invalid dates (handle both field formats)
        const validSessions = sessions.filter((session: any) => {
          const scheduledDate = session.scheduledDate || session.scheduled_date;
          if (!scheduledDate) return false;
          const date = new Date(scheduledDate);
          return !isNaN(date.getTime());
        });
        
        // If no valid sessions, treat as no payments
        if (validSessions.length === 0) {
          console.log(`⚠️ No valid sessions found for subscription ${subscription.id} - setting payment date to today`);
          
          const today = toZonedTime(new Date(), userTimezone);
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          
          expectedPaymentsData.push({
            student_id: studentId,
            student_name: studentName,
            subscription_id: subscription.id,
            next_payment_date: todayStr,
            next_payment_amount: paymentAmount,
            currency: subscription.currency || 'RUB',
            subscription_name: subscription.courseName || subscription.course_name || 'Subscription',
            last_session_date: 'No valid sessions'
          });
          
          continue;
        }
        
        // Find the last scheduled session (handle both field formats)
        const sortedSessions = validSessions.sort((a: any, b: any) => {
          const dateA = new Date(a.scheduledDate || a.scheduled_date);
          const dateB = new Date(b.scheduledDate || b.scheduled_date);
          return dateB.getTime() - dateA.getTime();
        });

        const lastSession = sortedSessions[0];
        const lastSessionDateUTC = new Date(lastSession.scheduledDate || lastSession.scheduled_date);
        
        // Validate the date
        if (isNaN(lastSessionDateUTC.getTime())) continue;
        
        // Convert to Cairo timezone
        const lastSessionDate = toZonedTime(lastSessionDateUTC, userTimezone);

        // Calculate next payment date (next occurrence of scheduled day after last session)
        // Note: schedule is already defined above
        const firstSchedule = Array.isArray(schedule) ? schedule[0] : schedule;
        const scheduledDay = firstSchedule.day; // e.g., "Monday", "Tuesday"
        
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDayIndex = daysOfWeek.indexOf(scheduledDay);
        
        if (targetDayIndex === -1) {
          continue;
        }

        // Start from the day after the last session (in Cairo timezone)
        let nextPaymentDate = new Date(lastSessionDate);
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);

        // Find the next occurrence of the target day
        while (nextPaymentDate.getDay() !== targetDayIndex) {
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);
        }
        
        // Format dates as YYYY-MM-DD strings
        const nextPaymentDateStr = `${nextPaymentDate.getFullYear()}-${String(nextPaymentDate.getMonth() + 1).padStart(2, '0')}-${String(nextPaymentDate.getDate()).padStart(2, '0')}`;
        const lastSessionDateStr = `${lastSessionDate.getFullYear()}-${String(lastSessionDate.getMonth() + 1).padStart(2, '0')}-${String(lastSessionDate.getDate()).padStart(2, '0')}`;

        expectedPaymentsData.push({
          student_id: studentId,
          student_name: studentName,
          subscription_id: subscription.id,
          next_payment_date: nextPaymentDateStr,
          next_payment_amount: paymentAmount,
          currency: subscription.currency || 'RUB',
          subscription_name: subscription.courseName || subscription.course_name || 'Subscription',
          last_session_date: lastSessionDateStr
        });
      }

      console.log('📅 Calculated expected payments:', expectedPaymentsData.length);
      return expectedPaymentsData;
    } catch (error) {
      console.error('❌ Error fetching expected payments:', error);
      return [];
    }
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // Calculate date range based on selected filter (in Cairo timezone)
  const dateRange = useMemo(() => {
    const now = toZonedTime(new Date(), userTimezone);
    let start: Date;
    let end: Date;

    switch (filterPeriod) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfDay(now);
        end = endOfDay(addWeeks(now, 1));
        break;
      case 'month':
        start = startOfDay(now);
        end = endOfDay(addMonths(now, 1));
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'nextMonth':
        const nextMonth = addMonths(now, 1);
        start = startOfMonth(nextMonth);
        end = endOfMonth(nextMonth);
        break;
      case 'custom':
        start = startOfDay(customDateRange.start);
        end = endOfDay(customDateRange.end);
        break;
      case 'all':
        start = new Date(2020, 0, 1); // Start from 2020
        end = new Date(2030, 11, 31); // Until 2030
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { start, end };
  }, [filterPeriod, customDateRange, userTimezone]);

  // Filter payments based on selected period (considering Cairo timezone)
  const filteredPayments = useMemo(() => {
    return expectedPayments.filter(payment => {
      // Parse YYYY-MM-DD as Cairo timezone date
      const [year, month, day] = payment.next_payment_date.split('-').map(Number);
      const paymentDate = new Date(year, month - 1, day);
      return isWithinInterval(paymentDate, dateRange);
    });
  }, [expectedPayments, dateRange]);

  // Calculate total expected amount
  const totalExpected = useMemo(() => {
    return filteredPayments.reduce((sum, payment) => sum + Number(payment.next_payment_amount), 0);
  }, [filteredPayments]);

  const getFilterLabel = () => {
    switch (filterPeriod) {
      case 'today': return 'Today';
      case 'week': return 'Next 7 Days';
      case 'month': return 'Next 30 Days';
      case 'thisMonth': return format(toZonedTime(new Date(), userTimezone), 'MMMM yyyy');
      case 'nextMonth': return format(addMonths(toZonedTime(new Date(), userTimezone), 1), 'MMMM yyyy');
      case 'custom': 
        return `${format(customDateRange.start, 'MMM dd')} - ${format(customDateRange.end, 'MMM dd, yyyy')}`;
      case 'all': return 'All Time';
      default: return format(new Date(), 'MMMM yyyy');
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Expected Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading expected payments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Expected Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading expected payments. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Expected Payments
            </CardTitle>
            <CardDescription>
              Upcoming student payments based on subscription schedules
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterPeriod} onValueChange={(value: FilterPeriod) => setFilterPeriod(value)}>
              <SelectTrigger className="w-[180px]">
                <CalendarRange className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Next 7 Days</SelectItem>
                <SelectItem value="month">Next 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="nextMonth">Next Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPayments.length > 0 ? (
          <>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Total Expected
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {filteredPayments.length > 0 && filteredPayments[0].currency === 'RUB' ? '₽' : 
                   filteredPayments.length > 0 && filteredPayments[0].currency === 'EUR' ? '€' : '$'}
                  {totalExpected.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-blue-700">
                  {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} expected
                </p>
                <p className="text-xs text-blue-600">
                  {getFilterLabel()}
                </p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Last Session</TableHead>
                  <TableHead>Expected Payment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Days Until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments
                  .sort((a, b) => new Date(a.next_payment_date).getTime() - new Date(b.next_payment_date).getTime())
                  .map((payment) => {
                    // Parse YYYY-MM-DD as Cairo timezone date
                    const [year, month, day] = payment.next_payment_date.split('-').map(Number);
                    const paymentDate = new Date(year, month - 1, day);
                    const nowInCairo = toZonedTime(new Date(), userTimezone);
                    const todayInCairo = new Date(nowInCairo.getFullYear(), nowInCairo.getMonth(), nowInCairo.getDate());
                    const daysUntil = Math.ceil((paymentDate.getTime() - todayInCairo.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <TableRow key={`${payment.subscription_id}-${payment.student_id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                              <User className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{payment.student_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{payment.subscription_name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {payment.last_session_date && !payment.last_session_date.startsWith('No') ? 
                              formatInUserTimezone(payment.last_session_date, userTimezone, 'MMM dd') : 
                              payment.last_session_date || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{formatInUserTimezone(payment.next_payment_date, userTimezone, 'MMM dd, yyyy')}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatInUserTimezone(payment.next_payment_date, userTimezone, 'EEEE')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            {payment.currency === 'RUB' ? '₽' : payment.currency === 'EUR' ? '€' : '$'}
                            {Number(payment.next_payment_amount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={daysUntil <= 3 ? 'destructive' : daysUntil <= 7 ? 'default' : 'secondary'}
                          >
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg font-medium">
              No expected payments
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {filterPeriod === 'all' 
                ? 'No subscription-based payments are expected' 
                : `No payments expected for ${getFilterLabel().toLowerCase()}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpectedPaymentsSection;

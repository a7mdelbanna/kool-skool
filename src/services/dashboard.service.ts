import { databaseService } from '@/services/firebase/database.service';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfWeek, endOfWeek, subWeeks, subDays, startOfDay, endOfDay } from 'date-fns';

export interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  studentCount: number;
  newStudentsThisMonth: number;
  weeklyLessonCount: number;
  lessonCompletionRate: number;
  avgLessonPrice: number;
  avgStudentLoad: number;
  revenueChange: number;
  expensesChange: number;
  profitChange: number;
  studentChange: number;
  lessonChange: number;
  currency: string;
}

export interface ChartData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface RecentStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  courseName: string;
  lessonType: 'individual' | 'group';
  ageGroup: string;
  level: string;
  lessonsCompleted: number;
  nextLesson: string;
  paymentStatus: string;
  nextPaymentDate: string;
}

export interface UpcomingLesson {
  id: string;
  studentName: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

class DashboardService {
  async getDashboardMetrics(schoolId: string): Promise<DashboardMetrics> {
    try {
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const thisWeekStart = startOfWeek(now);
      const thisWeekEnd = endOfWeek(now);

      // Get all transactions
      const transactions = await databaseService.query('transactions', {
        where: [{ field: 'school_id', operator: '==', value: schoolId }]
      });

      // Calculate revenue and expenses
      let totalRevenue = 0;
      let totalExpenses = 0;
      let thisMonthRevenue = 0;
      let thisMonthExpenses = 0;
      let lastMonthRevenue = 0;
      let lastMonthExpenses = 0;

      if (transactions && transactions.length > 0) {
        transactions.forEach((transaction: any) => {
          const amount = Number(transaction.amount) || 0;
          const transactionDate = new Date(transaction.date);
          
          if (transaction.type === 'income') {
            totalRevenue += amount;
            
            if (isWithinInterval(transactionDate, { start: thisMonthStart, end: thisMonthEnd })) {
              thisMonthRevenue += amount;
            }
            if (isWithinInterval(transactionDate, { start: lastMonthStart, end: lastMonthEnd })) {
              lastMonthRevenue += amount;
            }
          } else if (transaction.type === 'expense') {
            totalExpenses += amount;
            
            if (isWithinInterval(transactionDate, { start: thisMonthStart, end: thisMonthEnd })) {
              thisMonthExpenses += amount;
            }
            if (isWithinInterval(transactionDate, { start: lastMonthStart, end: lastMonthEnd })) {
              lastMonthExpenses += amount;
            }
          }
        });
      }

      // Calculate changes
      const revenueChange = lastMonthRevenue > 0 
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;
      const expensesChange = lastMonthExpenses > 0 
        ? Math.round(((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
        : 0;
      const thisMonthProfit = thisMonthRevenue - thisMonthExpenses;
      const lastMonthProfit = lastMonthRevenue - lastMonthExpenses;
      const profitChange = lastMonthProfit !== 0 
        ? Math.round(((thisMonthProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100)
        : 0;

      // Get students
      const students = await databaseService.query('students', {
        where: [{ field: 'schoolId', operator: '==', value: schoolId }]
      });

      const studentCount = students?.length || 0;

      // Count new students this month
      let newStudentsThisMonth = 0;
      let lastMonthStudents = 0;
      
      if (students && students.length > 0) {
        students.forEach((student: any) => {
          const createdDate = student.createdAt ? new Date(student.createdAt) : 
                             student.created_at ? new Date(student.created_at) : null;
          
          if (createdDate) {
            if (isWithinInterval(createdDate, { start: thisMonthStart, end: thisMonthEnd })) {
              newStudentsThisMonth++;
            }
            if (isWithinInterval(createdDate, { start: lastMonthStart, end: lastMonthEnd })) {
              lastMonthStudents++;
            }
          }
        });
      }

      const studentChange = lastMonthStudents > 0 
        ? Math.round(((newStudentsThisMonth - lastMonthStudents) / lastMonthStudents) * 100)
        : newStudentsThisMonth > 0 ? 100 : 0;

      // Get sessions for this week
      const sessions = await databaseService.query('sessions', {
        where: [{ field: 'schoolId', operator: '==', value: schoolId }]
      });

      // Get subscriptions for average price calculation
      const subscriptions = await databaseService.query('subscriptions', {
        where: [{ field: 'schoolId', operator: '==', value: schoolId }]
      });

      let weeklyLessonCount = 0;
      let lastWeekLessonCount = 0;
      let completedSessions = 0;
      let totalSessions = 0;

      if (sessions && sessions.length > 0) {
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        const lastWeekEnd = endOfWeek(subWeeks(now, 1));

        sessions.forEach((session: any) => {
          const sessionDate = new Date(session.scheduled_date);
          
          // Count total sessions for completion rate
          if (session.status !== 'cancelled') {
            totalSessions++;
            if (session.status === 'completed') {
              completedSessions++;
            }
          }

          // Count weekly lessons
          if (isWithinInterval(sessionDate, { start: thisWeekStart, end: thisWeekEnd })) {
            weeklyLessonCount++;
          }
          if (isWithinInterval(sessionDate, { start: lastWeekStart, end: lastWeekEnd })) {
            lastWeekLessonCount++;
          }
        });
      }

      const lessonCompletionRate = totalSessions > 0 
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

      // Calculate average price from subscriptions
      let avgLessonPrice = 0;
      if (subscriptions && subscriptions.length > 0) {
        let totalPrice = 0;
        let totalLessons = 0;
        
        subscriptions.forEach((sub: any) => {
          if (sub.price_mode === 'perSession' && sub.price_per_session > 0) {
            totalPrice += Number(sub.price_per_session) * (sub.session_count || 1);
            totalLessons += sub.session_count || 1;
          } else if (sub.total_price > 0 && sub.session_count > 0) {
            totalPrice += Number(sub.total_price);
            totalLessons += sub.session_count;
          }
        });
        
        if (totalLessons > 0) {
          avgLessonPrice = Math.round(totalPrice / totalLessons);
        }
      }

      const lessonChange = lastWeekLessonCount > 0 
        ? Math.round(((weeklyLessonCount - lastWeekLessonCount) / lastWeekLessonCount) * 100)
        : 0;

      // Calculate average student load (hours per week per tutor)
      // For now, we'll use a simple calculation based on weekly lessons
      const avgStudentLoad = weeklyLessonCount; // Assuming 1 hour per lesson

      // Get default currency
      const currencies = await databaseService.query('currencies', {
        where: [
          { field: 'school_id', operator: '==', value: schoolId },
          { field: 'is_default', operator: '==', value: true }
        ]
      });
      
      const currency = currencies && currencies.length > 0 ? currencies[0].code : 'USD';

      return {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        studentCount,
        newStudentsThisMonth,
        weeklyLessonCount,
        lessonCompletionRate,
        avgLessonPrice,
        avgStudentLoad,
        revenueChange,
        expensesChange,
        profitChange,
        studentChange,
        lessonChange,
        currency
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default values on error
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        studentCount: 0,
        newStudentsThisMonth: 0,
        weeklyLessonCount: 0,
        lessonCompletionRate: 0,
        avgLessonPrice: 0,
        avgStudentLoad: 0,
        revenueChange: 0,
        expensesChange: 0,
        profitChange: 0,
        studentChange: 0,
        lessonChange: 0,
        currency: 'USD'
      };
    }
  }

  async getRevenueExpensesChartData(
    schoolId: string,
    range: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<ChartData[]> {
    try {
      const now = new Date();
      const data: ChartData[] = [];
      
      console.log('🔍 [RevenueChart] Fetching data for schoolId:', schoolId, 'range:', range);
      
      // Try both field names for transactions
      const transactionsWithSchoolId = await databaseService.query('transactions', {
        where: [{ field: 'schoolId', operator: '==', value: schoolId }]
      });
      
      const transactionsWithSchool_id = await databaseService.query('transactions', {
        where: [{ field: 'school_id', operator: '==', value: schoolId }]
      });
      
      console.log('🔍 [RevenueChart] Transactions with schoolId:', transactionsWithSchoolId?.length || 0);
      console.log('🔍 [RevenueChart] Transactions with school_id:', transactionsWithSchool_id?.length || 0);
      
      const transactions = (transactionsWithSchoolId?.length > 0) ? transactionsWithSchoolId : transactionsWithSchool_id;

      // Try both field names for payments
      const paymentsWithSchoolId = await databaseService.query('payments', {
        where: [{ field: 'schoolId', operator: '==', value: schoolId }]
      });
      
      const paymentsWithSchool_id = await databaseService.query('payments', {
        where: [{ field: 'school_id', operator: '==', value: schoolId }]
      });
      
      console.log('🔍 [RevenueChart] Payments with schoolId:', paymentsWithSchoolId?.length || 0);
      console.log('🔍 [RevenueChart] Payments with school_id:', paymentsWithSchool_id?.length || 0);
      
      const payments = (paymentsWithSchoolId?.length > 0) ? paymentsWithSchoolId : paymentsWithSchool_id;

      if ((!transactions || transactions.length === 0) && (!payments || payments.length === 0)) {
        console.log('🚨 [RevenueChart] No transactions or payments found!');
        return [];
      }
      
      console.log('🔍 [RevenueChart] Found transactions:', transactions?.length || 0, 'payments:', payments?.length || 0);
      if (transactions?.length > 0) {
        console.log('🔍 [RevenueChart] Sample transaction:', transactions[0]);
      }
      if (payments?.length > 0) {
        console.log('🔍 [RevenueChart] Sample payment:', payments[0]);
      }

      // Determine periods based on range
      const periods = range === 'daily' ? 30 : range === 'weekly' ? 12 : 6;
      
      for (let i = periods - 1; i >= 0; i--) {
        let periodStart: Date;
        let periodEnd: Date;
        let periodLabel: string;

        if (range === 'daily') {
          const date = subDays(now, i);
          periodStart = startOfDay(date);
          periodEnd = endOfDay(date);
          periodLabel = format(date, 'MMM d');
        } else if (range === 'weekly') {
          const date = subWeeks(now, i);
          periodStart = startOfWeek(date);
          periodEnd = endOfWeek(date);
          periodLabel = `Week ${periods - i}`;
        } else {
          const date = subMonths(now, i);
          periodStart = startOfMonth(date);
          periodEnd = endOfMonth(date);
          periodLabel = format(date, 'MMM yyyy');
        }

        // Calculate revenue and expenses for this period
        let revenue = 0;
        let expenses = 0;

        // Add transaction income and expenses
        if (transactions && transactions.length > 0) {
          transactions.forEach((transaction: any) => {
            const transactionDate = new Date(transaction.date);
            if (isWithinInterval(transactionDate, { start: periodStart, end: periodEnd })) {
              const amount = Number(transaction.amount) || 0;
              if (transaction.type === 'income') {
                revenue += amount;
              } else if (transaction.type === 'expense') {
                expenses += amount;
              }
            }
          });
        }

        // Add payments to revenue (matching Finances page implementation)
        if (payments && payments.length > 0) {
          payments.forEach((payment: any) => {
            const paymentDate = payment.payment_date ? new Date(payment.payment_date) : 
                               payment.date ? new Date(payment.date) : null;
            if (paymentDate && isWithinInterval(paymentDate, { start: periodStart, end: periodEnd })) {
              const amount = Number(payment.amount) || 0;
              if (payment.status === 'completed' || payment.status === 'paid') {
                revenue += amount;
              }
            }
          });
        }

        console.log(`🔍 [RevenueChart] Period ${periodLabel}: Revenue $${revenue}, Expenses $${expenses}, Profit $${revenue - expenses}`);
        
        data.push({
          date: periodLabel,
          revenue,
          expenses,
          profit: revenue - expenses
        });
      }

      console.log('🔍 [RevenueChart] Final chart data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }
  }

  async getRecentStudents(schoolId: string, limit: number = 4): Promise<RecentStudent[]> {
    try {
      // Get recent students
      const students = await databaseService.query('students', {
        where: [{ field: 'schoolId', operator: '==', value: schoolId }]
      });

      if (!students || students.length === 0) {
        return [];
      }

      // Sort by creation date and take the most recent
      const sortedStudents = students
        .sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, limit);

      // Fetch user details and subscriptions
      const recentStudents: RecentStudent[] = [];

      for (const student of sortedStudents) {
        // Get user details
        const user = await databaseService.getById('users', student.userId || student.user_id);
        
        // Get student's active subscription
        const subscriptions = await databaseService.query('subscriptions', {
          where: [
            { field: 'student_id', operator: '==', value: student.id },
            { field: 'status', operator: '==', value: 'active' }
          ]
        });

        const activeSubscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

        // Get upcoming sessions
        const sessions = await databaseService.query('sessions', {
          where: [
            { field: 'student_id', operator: '==', value: student.id },
            { field: 'status', operator: '==', value: 'scheduled' }
          ]
        });

        const upcomingSessions = sessions ? 
          sessions.filter((s: any) => new Date(s.scheduled_date) >= new Date())
            .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
          : [];

        const nextSession = upcomingSessions.length > 0 ? upcomingSessions[0] : null;

        // Count completed lessons
        const completedSessions = sessions ? 
          sessions.filter((s: any) => s.status === 'completed').length : 0;

        recentStudents.push({
          id: student.id,
          firstName: user?.firstName || user?.first_name || '',
          lastName: user?.lastName || user?.last_name || '',
          email: user?.email || '',
          courseName: student.course_name || 'No course',
          lessonType: activeSubscription?.subscription_type === 'group' ? 'group' : 'individual',
          ageGroup: student.age_group || 'adult',
          level: student.level || '',
          lessonsCompleted: completedSessions,
          nextLesson: nextSession ? 
            format(new Date(nextSession.scheduled_date), 'MMM d, h:mm a') : 
            'No upcoming lesson',
          paymentStatus: activeSubscription?.payment_status || 'overdue',
          nextPaymentDate: activeSubscription?.next_payment_date || ''
        });
      }

      return recentStudents;
    } catch (error) {
      console.error('Error fetching recent students:', error);
      return [];
    }
  }

  async getUpcomingLessons(schoolId: string, limit: number = 5): Promise<UpcomingLesson[]> {
    try {
      // First get all sessions for the school
      const sessions = await databaseService.query('sessions', {
        where: [
          { field: 'schoolId', operator: '==', value: schoolId }
        ]
      });

      // Filter for scheduled sessions client-side
      const scheduledSessions = sessions ? sessions.filter((s: any) => s.status === 'scheduled') : [];

      if (!scheduledSessions || scheduledSessions.length === 0) {
        return [];
      }

      const now = new Date();
      const upcomingSessions = scheduledSessions
        .filter((s: any) => new Date(s.scheduled_date) >= now)
        .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
        .slice(0, limit);

      const upcomingLessons: UpcomingLesson[] = [];

      for (const session of upcomingSessions) {
        // Get student and user details
        const student = session.student_id ? 
          await databaseService.getById('students', session.student_id) : null;
        const user = student ? 
          await databaseService.getById('users', student.userId || student.user_id) : null;

        const studentName = user ? 
          `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() :
          'Unknown Student';

        const sessionDate = new Date(session.scheduled_date);
        const isToday = format(sessionDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
        const isTomorrow = format(sessionDate, 'yyyy-MM-dd') === format(new Date(now.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        upcomingLessons.push({
          id: session.id,
          studentName,
          subject: session.course_name || student?.course_name || 'General',
          date: isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(sessionDate, 'MMM d'),
          time: format(sessionDate, 'h:mm a'),
          duration: `${session.duration_minutes || 60} min`,
          status: 'upcoming'
        });
      }

      return upcomingLessons;
    } catch (error) {
      console.error('Error fetching upcoming lessons:', error);
      return [];
    }
  }

  async getNewStudentsChartData(schoolId: string): Promise<number[]> {
    try {
      console.log('🔍 [NewStudentsChart] Fetching students for schoolId:', schoolId);
      
      // Try both field names to handle inconsistency
      const studentsWithSchoolId = await databaseService.query('students', {
        where: [{ field: 'schoolId', operator: '==', value: schoolId }]
      });
      
      const studentsWithSchool_id = await databaseService.query('students', {
        where: [{ field: 'school_id', operator: '==', value: schoolId }]
      });
      
      console.log('🔍 [NewStudentsChart] Students with schoolId field:', studentsWithSchoolId?.length || 0);
      console.log('🔍 [NewStudentsChart] Students with school_id field:', studentsWithSchool_id?.length || 0);
      
      // Use whichever query returned results
      const students = (studentsWithSchoolId?.length > 0) ? studentsWithSchoolId : studentsWithSchool_id;

      if (!students || students.length === 0) {
        console.log('🚨 [NewStudentsChart] No students found!');
        return [0, 0, 0, 0, 0, 0];
      }
      
      console.log('🔍 [NewStudentsChart] Total students found:', students.length);
      console.log('🔍 [NewStudentsChart] First student sample:', students[0]);

      const monthsData: number[] = [];
      const now = new Date();

      // Get data for last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        const studentsInMonth = students.filter((student: any) => {
          const createdDate = student.createdAt ? new Date(student.createdAt) : 
                             student.created_at ? new Date(student.created_at) : null;
          return createdDate && isWithinInterval(createdDate, { start: monthStart, end: monthEnd });
        }).length;
        
        console.log(`🔍 [NewStudentsChart] Month ${i} (${format(monthStart, 'MMM yyyy')}): ${studentsInMonth} students`);
        monthsData.push(studentsInMonth);
      }

      console.log('🔍 [NewStudentsChart] Final month data:', monthsData);
      return monthsData;
    } catch (error) {
      console.error('Error fetching new students chart data:', error);
      return [0, 0, 0, 0, 0, 0];
    }
  }
}

export const dashboardService = new DashboardService();
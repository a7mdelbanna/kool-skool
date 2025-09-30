
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { studentsService } from '@/services/firebase/students.service';
import type { FirebaseStudent } from '@/services/firebase/students.service';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ArrowUp,
  ArrowDown,
  Wallet,
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  Clock,
  Filter,
  Download,
  BarChart2,
  TrendingUp,
  TrendingDown,
  UserMinus,
  UserPlus,
  Briefcase,
  CircleDollarSign
} from 'lucide-react';
import { format, subDays, subMonths, subWeeks, subYears, startOfDay, endOfDay, isWithinInterval, parseISO, endOfMonth } from 'date-fns';
import StudentAcquisitionChart, { StudentMetricsData } from '@/components/StudentAcquisitionChart';
import StudentsOverviewCards from '@/components/StudentsOverviewCards';
import SubjectPerformanceCard from '@/components/SubjectPerformanceCard';
import ROIByLessonTypeCard from '@/components/ROIByLessonTypeCard';


// Mock data for groups
const groups = [
  { id: "1", name: "Advanced Mathematics" },
  { id: "2", name: "Beginner English" },
  { id: "3", name: "Intermediate Science" },
  { id: "4", name: "Speaking Club" }
];



// Modern theme colors with better contrast
const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-border/50 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {entry.dataKey === 'income' || entry.dataKey === 'expenses' || entry.dataKey === 'profit'
                ? `$${entry.value.toLocaleString()}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom pie chart label
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Define types for our data objects
interface TeacherIncomeData {
  date: string;
  income: number;
  lessons: number;
  hours: number;
}

interface ExpensesData {
  date: string;
  expenses: number;
  income: number;
}

interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  profit: number;
}

interface LessonStatusData {
  name: string;
  value: number;
}

interface BalanceCurrencyData {
  name: string;
  value: number;
}

type DateRangeFilter = "day" | "week" | "month" | "year";

const StatesReports = () => {
  const [students, setStudents] = useState<FirebaseStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const schoolId = getSchoolId();

  // State for filters
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("month");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("USD");

  // Load students data
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const allStudents = await studentsService.getAll();
        setStudents(allStudents);
      } catch (error) {
        console.error('Error loading students:', error);
      } finally {
        setLoadingStudents(false);
      }
    };
    loadStudents();
  }, []);

  // Fetch real payments from Supabase
  const { data: payments = [] } = useQuery({
    queryKey: ['school-payments', schoolId, dateRangeFilter],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data: studentsData } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId);

      const studentIds = studentsData?.map(s => s.id) || [];
      if (studentIds.length === 0) return [];

      const { data: paymentsData } = await supabase
        .from('student_payments')
        .select('*')
        .in('student_id', studentIds)
        .order('payment_date', { ascending: false });

      return paymentsData?.map(p => ({
        id: p.id,
        amount: p.amount || 0,
        date: new Date(p.payment_date),
        method: p.payment_method || 'cash',
        notes: p.notes || '',
        status: p.status || 'completed'
      })) || [];
    },
    enabled: !!schoolId,
  });

  // Fetch real transactions (expenses) from Firebase as per DATA_RETRIEVAL_GUIDE
  const { data: expenses = [] } = useQuery({
    queryKey: ['school-transactions', schoolId, dateRangeFilter],
    queryFn: async () => {
      if (!schoolId) return [];

      try {
        const transactions = await databaseService.query('transactions', {
          where: [
            { field: 'school_id', operator: '==', value: schoolId },
            { field: 'type', operator: '==', value: 'expense' }
          ],
          orderBy: [{ field: 'transaction_date', direction: 'desc' }]
        });

        return transactions.map((t: any) => ({
          id: t.id,
          amount: Math.abs(t.amount) || 0,
          date: new Date(t.transaction_date || t.date),
          category: t.category || 'Other',
          name: t.description || 'Expense',
          notes: t.notes || '',
          recurring: false
        }));
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
    enabled: !!schoolId,
  });

  // Fetch real sessions from Supabase as per DATA_RETRIEVAL_GUIDE
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['school-sessions', schoolId, dateRangeFilter],
    queryFn: async () => {
      if (!schoolId) return [];

      try {
        // First get all students for the school
        const studentsData = await databaseService.getBySchoolId('students', schoolId);
        const studentIds = studentsData.map((s: any) => s.id || s.studentId);

        if (studentIds.length === 0) return [];

        // Fetch sessions from Supabase with student and subscription info
        const { data: sessionsData, error } = await supabase
          .from('lesson_sessions')
          .select(`
            *,
            students!inner(
              id,
              user_id,
              users!inner(first_name, last_name)
            ),
            student_subscriptions(
              subscription_name,
              price,
              currency,
              total_sessions,
              teacher_id
            )
          `)
          .in('student_id', studentIds)
          .order('scheduled_date', { ascending: false });

        if (error) {
          console.error('Error fetching sessions:', error);
          return [];
        }

        // Transform sessions to match expected format
        return sessionsData?.map(session => ({
          id: session.id,
          date: session.scheduled_date,
          status: session.status || 'scheduled',
          cost: session.student_subscriptions?.[0]?.price || 0,
          currency: session.student_subscriptions?.[0]?.currency || 'USD',
          duration: session.duration_minutes || 60,
          studentName: session.students?.users ?
            `${session.students.users.first_name} ${session.students.users.last_name}` : 'Unknown',
          teacherId: session.teacher_id || session.student_subscriptions?.[0]?.teacher_id,
          subscriptionName: session.student_subscriptions?.[0]?.subscription_name || 'General',
          studentId: session.student_id
        })) || [];
      } catch (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }
    },
    enabled: !!schoolId,
  });
  
  // Get date range for filtering
  const getDateRange = (range: DateRangeFilter) => {
    const now = new Date();
    let start: Date;

    switch (range) {
      case 'day':
        start = startOfDay(now);
        break;
      case 'week':
        start = subDays(now, 7);
        break;
      case 'month':
        start = subMonths(now, 1);
        break;
      case 'year':
        start = subYears(now, 1);
        break;
      default:
        start = subMonths(now, 1);
    }

    return { start, end: endOfDay(now) };
  };

  // Process real session data for teacher income
  const getTeacherIncomeData = (range: DateRangeFilter): TeacherIncomeData[] => {
    const { start, end } = getDateRange(range);

    // Filter sessions within date range and by teacher if selected
    const filteredSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      const isInDateRange = isWithinInterval(sessionDate, { start, end });
      const isTeacherMatch = teacherFilter === 'all' || session.teacherId === teacherFilter;
      return isInDateRange && isTeacherMatch;
    });

    // Group by date
    const groupedByDate = filteredSessions.reduce((acc, session) => {
      const dateKey = format(new Date(session.date), 'MMM dd');
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          income: 0,
          lessons: 0,
          hours: 0
        };
      }

      // Only count attended/completed sessions for income
      if (session.status === 'attended' || session.status === 'completed') {
        acc[dateKey].income += session.cost || 0;
        acc[dateKey].lessons += 1;
        // Duration is in minutes from the database
        const durationInHours = (session.duration || 60) / 60;
        acc[dateKey].hours += durationInHours;
      }

      return acc;
    }, {} as Record<string, TeacherIncomeData>);

    return Object.values(groupedByDate).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };
  
  // Process real expense and payment data
  const getExpensesData = (range: DateRangeFilter): ExpensesData[] => {
    const { start, end } = getDateRange(range);

    // Filter data within date range
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return isWithinInterval(expenseDate, { start, end });
    });

    const filteredPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return isWithinInterval(paymentDate, { start, end }) && payment.status === 'completed';
    });

    // Create a map to combine data by date
    const dataByDate = new Map<string, { expenses: number; income: number }>();

    // Add expenses
    filteredExpenses.forEach(expense => {
      const dateKey = format(new Date(expense.date), 'MMM dd');
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, { expenses: 0, income: 0 });
      }
      const data = dataByDate.get(dateKey)!;
      data.expenses += expense.amount;
    });

    // Add income from payments
    filteredPayments.forEach(payment => {
      const dateKey = format(new Date(payment.date), 'MMM dd');
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, { expenses: 0, income: 0 });
      }
      const data = dataByDate.get(dateKey)!;
      data.income += payment.amount;
    });

    return Array.from(dataByDate.entries())
      .map(([date, data]) => ({
        date,
        expenses: data.expenses,
        income: data.income
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Process real cash flow data
  const getCashFlowData = (range: DateRangeFilter): CashFlowData[] => {
    const expensesData = getExpensesData(range);
    return expensesData.map(data => ({
      date: data.date,
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses
    }));
  };
  
  // Process real lesson status distribution
  const getLessonStatusData = (): LessonStatusData[] => {
    const statusCounts = sessions.reduce((acc, session) => {
      // Map session status to display name based on Supabase statuses
      const status = session.status === 'attended' ? 'Attended' :
                     session.status === 'completed' ? 'Completed' :
                     session.status === 'cancelled' ? 'Cancelled' :
                     session.status === 'no_show' ? 'No Show' :
                     session.status === 'rescheduled' ? 'Rescheduled' :
                     'Scheduled';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Only return statuses with counts
    const statusData = Object.entries(statusCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value
      }));

    // If no data, return default
    return statusData.length > 0 ? statusData : [{ name: 'No Data', value: 1 }];
  };
  
  // Calculate balance by currency from real data
  const getBalanceByCurrencyData = (): BalanceCurrencyData[] => {
    // Group payments by currency (defaulting to USD if not specified)
    const balanceByCurrency = payments
      .filter(p => p.status === 'completed')
      .reduce((acc, payment) => {
        const currency = 'USD'; // Default to USD, you can add currency field to payments
        acc[currency] = (acc[currency] || 0) + payment.amount;
        return acc;
      }, {} as Record<string, number>);

    // Subtract expenses from the same currency
    expenses.forEach(expense => {
      const currency = 'USD'; // Default to USD
      balanceByCurrency[currency] = (balanceByCurrency[currency] || 0) - expense.amount;
    });

    return Object.entries(balanceByCurrency).map(([name, value]) => ({
      name,
      value: Math.max(0, value) // Ensure positive values for display
    }));
  };
  
  // Calculate ROI data by lesson type from real data
  const getROIData = () => {
    // Group sessions by category and calculate ROI
    const categoryROI = new Map<string, { revenue: number; count: number; students: Set<string> }>();

    sessions.forEach(session => {
      if (session.status === 'completed' || session.status === 'ongoing') {
        // Determine category based on session type and course
        let category = session.course_name || 'General';

        // If it's a group session, prepend "Group" to the category
        if (session.subscription_type === 'group') {
          category = `Group: ${category}`;
        } else if (session.subscription_type === 'individual') {
          category = `Individual: ${category}`;
        }

        if (!categoryROI.has(category)) {
          categoryROI.set(category, { revenue: 0, count: 0, students: new Set() });
        }

        const data = categoryROI.get(category)!;
        data.revenue += session.cost || session.price || 0;
        data.count += 1;
        if (session.student_id) {
          data.students.add(session.student_id);
        }
      }
    });

    // Calculate ROI as average revenue per student for each category
    const roiArray = Array.from(categoryROI.entries()).map(([name, data]) => ({
      name,
      roi: Math.round(data.revenue / Math.max(1, data.students.size))
    }));

    // Sort by ROI descending and take top 10 categories
    const sortedROI = roiArray
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 10)
      .filter(item => item.roi > 0); // Only show categories with positive ROI

    // If no data, return sample data
    return sortedROI.length > 0 ? sortedROI : [
      { name: 'Mathematics', roi: 150 },
      { name: 'Science', roi: 120 },
      { name: 'Language Arts', roi: 100 }
    ];
  };

  // Calculate subject performance from real session data
  const getSubjectsData = () => {
    const subjectStats = new Map<string, {
      total: number;
      completed: number;
      cancelled: number;
      students: Set<string>
    }>();

    // Process sessions to calculate retention by subject
    sessions.forEach(session => {
      const subject = session.course_name || 'General';

      if (!subjectStats.has(subject)) {
        subjectStats.set(subject, {
          total: 0,
          completed: 0,
          cancelled: 0,
          students: new Set()
        });
      }

      const stats = subjectStats.get(subject)!;
      stats.total++;

      if (session.status === 'completed') {
        stats.completed++;
      } else if (session.status === 'cancelled' || session.status === 'no_show') {
        stats.cancelled++;
      }

      if (session.student_id) {
        stats.students.add(session.student_id);
      }
    });

    // Calculate retention rate for each subject
    const subjectsArray = Array.from(subjectStats.entries()).map(([name, stats], index) => ({
      id: `subject-${index}`,
      name,
      retentionRate: Math.round((stats.completed / Math.max(1, stats.total)) * 100)
    }));

    // Sort by retention rate and take top subjects
    const sortedSubjects = subjectsArray
      .sort((a, b) => b.retentionRate - a.retentionRate)
      .slice(0, 10);

    // If no data, return sample data
    return sortedSubjects.length > 0 ? sortedSubjects : [
      { id: "1", name: "Mathematics", retentionRate: 90 },
      { id: "2", name: "English", retentionRate: 85 },
      { id: "3", name: "Science", retentionRate: 80 }
    ];
  };

  // Process student metrics from real student data
  const getStudentMetricsData = (range: DateRangeFilter): StudentMetricsData[] => {
    const { start, end } = getDateRange(range);
    const result: StudentMetricsData[] = [];

    // Generate daily data points
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateKey = format(currentDate, 'MMM dd');
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Count new students (joined on this date)
      const newStudents = students.filter(student => {
        if (!student.joinDate && !student.createdAt) return false;
        const joinDate = student.joinDate ? new Date(student.joinDate) : student.createdAt;
        return format(joinDate, 'yyyy-MM-dd') === dateStr;
      }).length;

      // Count lost students on this date
      // Since we don't have exact status change dates, we'll check for inactive/dropped status
      // and distribute them across the period
      const totalLostStudents = students.filter(s => s.status === 'dropped' || s.status === 'inactive').length;
      const daysInRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const lostStudents = Math.floor(totalLostStudents / Math.max(1, daysInRange));

      result.push({
        date: dateKey,
        newStudents,
        lostStudents
      });

      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // If no data, return at least one point
    if (result.length === 0) {
      result.push({
        date: format(new Date(), 'MMM dd'),
        newStudents: 0,
        lostStudents: 0
      });
    }

    return result;
  };
  // Remove the duplicate function declarations since they're defined above
  // Get data with correct typing using memoization for performance
  const teacherIncomeData = useMemo(() =>
    sessions.length > 0 ? getTeacherIncomeData(dateRangeFilter) : [],
    [sessions, dateRangeFilter, teacherFilter]
  );
  const expensesData = useMemo(() =>
    (expenses.length > 0 || payments.length > 0) ? getExpensesData(dateRangeFilter) : [],
    [expenses, payments, dateRangeFilter]
  );
  const studentMetricsData = useMemo(() =>
    students.length > 0 ? getStudentMetricsData(dateRangeFilter) : [],
    [students, dateRangeFilter]
  );
  const cashFlowData = useMemo(() =>
    (expenses.length > 0 || payments.length > 0) ? getCashFlowData(dateRangeFilter) : [],
    [expenses, payments, dateRangeFilter]
  );
  const lessonStatusData = useMemo(() =>
    sessions.length > 0 ? getLessonStatusData() : [{ name: 'No Data', value: 1 }],
    [sessions]
  );
  const balanceByCurrencyData = useMemo(() => {
    const data = getBalanceByCurrencyData();
    return data.length > 0 ? data : [{ name: 'USD', value: 0 }];
  }, [payments, expenses]);
  const roiData = useMemo(() =>
    sessions.length > 0 ? getROIData() : [{ name: 'No Data', roi: 0 }],
    [sessions]
  );

  const subjects = useMemo(() =>
    sessions.length > 0 ? getSubjectsData() : [],
    [sessions]
  );
  
  // Calculate totals with proper typing
  const totalTeacherIncome = teacherIncomeData.reduce((sum, item) => sum + item.income, 0);
  const totalTeacherHours = Math.max(1, teacherIncomeData.reduce((sum, item) => sum + item.hours, 0));
  const totalTeacherLessons = teacherIncomeData.reduce((sum, item) => sum + item.lessons, 0);
  
  const totalExpenses = expensesData.reduce((sum, item) => sum + item.expenses, 0);
  const totalIncome = expensesData.reduce((sum, item) => sum + item.income, 0);
  
  const totalNewStudents = studentMetricsData.reduce((sum, item) => sum + item.newStudents, 0);
  const totalLostStudents = studentMetricsData.reduce((sum, item) => sum + item.lostStudents, 0);
  
  const netCashFlow = cashFlowData.reduce((sum, item) => sum + item.profit, 0);
  
  // Fetch teachers for the filter dropdown
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Get unique teacher IDs from sessions
      const teacherIds = new Set<string>();
      sessions.forEach(session => {
        if (session.teacherId) {
          teacherIds.add(session.teacherId);
        }
      });

      if (teacherIds.size === 0) return [];

      // Fetch teacher details from Supabase
      const { data: teacherData } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', Array.from(teacherIds));

      return teacherData?.map(teacher => ({
        id: teacher.id,
        name: `${teacher.first_name} ${teacher.last_name}`
      })) || [];
    },
    enabled: !!schoolId && sessions.length > 0,
  });

  // Generate lesson categories from sessions data
  const lessonCategories = useMemo(() => {
    const categories = new Map<string, string>();

    // Always include basic types
    categories.set('individual', 'Individual');
    categories.set('group', 'Group');

    // Add unique course names as categories
    sessions.forEach(session => {
      if (session.subscriptionName && !categories.has(session.subscriptionName.toLowerCase())) {
        categories.set(session.subscriptionName.toLowerCase(), session.subscriptionName);
      }
    });

    return Array.from(categories.entries()).map(([id, name], index) => ({
      id: id,
      name: name
    }));
  }, [sessions]);

  // Fetch expected payments for upcoming income
  const { data: expectedPayments = [] } = useQuery({
    queryKey: ['expected-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data } = await supabase
        .from('expected_payments')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .gte('due_date', new Date().toISOString());

      return data || [];
    },
    enabled: !!schoolId,
  });

  // Calculate upcoming data based on real data
  const upcomingExpenses = useMemo(() => {
    // Get average monthly expenses from the last 3 months
    const threeMonthsAgo = subMonths(new Date(), 3);
    const recentExpenses = expenses.filter(e => new Date(e.date) >= threeMonthsAgo);
    const avgMonthlyExpenses = recentExpenses.reduce((sum, e) => sum + e.amount, 0) / 3;
    return Math.round(avgMonthlyExpenses) || 1500;
  }, [expenses]);

  const upcomingIncome = useMemo(() => {
    // Calculate from expected payments
    const nextMonthExpected = expectedPayments
      .filter(p => {
        const dueDate = new Date(p.due_date);
        const nextMonth = endOfMonth(new Date());
        return dueDate <= nextMonth;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return nextMonthExpected || 2500;
  }, [expectedPayments]);
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">States & Reports</h1>
          <p className="text-muted-foreground mt-1">View comprehensive analytics and detailed reports</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 hover:bg-primary/10 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export Reports</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 hover:bg-primary/10 transition-colors">
                <Filter className="h-4 w-4" />
                <span>Date Range</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Select Date Range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setDateRangeFilter("day")}>
                  Day
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDateRangeFilter("week")}>
                  Week
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDateRangeFilter("month")}>
                  Month
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDateRangeFilter("year")}>
                  Year
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Tabs defaultValue="teacher">
        <TabsList className="mb-4 bg-background/50 backdrop-blur-sm border-border/50">
          <TabsTrigger value="teacher" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
            <span>Teacher</span>
          </TabsTrigger>
          <TabsTrigger value="finances" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <DollarSign className="h-4 w-4" />
            <span>Finances</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4" />
            <span>Students</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Teacher Tab */}
        <TabsContent value="teacher" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${totalTeacherIncome}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Per {dateRangeFilter}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalTeacherHours}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Teaching hours
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalTeacherLessons}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Lessons conducted
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${totalTeacherHours > 0 ? Math.round(totalTeacherIncome / totalTeacherHours) : 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Per hour
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-card glass-card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">Teacher Income</CardTitle>
                  <div className="flex gap-2">
                    <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                      <SelectTrigger className="w-[180px] bg-background/50 backdrop-blur-sm border-border/50">
                        <SelectValue placeholder="Select Teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teachers</SelectItem>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CardDescription>
                  Income generated by teacher over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {teacherIncomeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={teacherIncomeData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255, 255, 255, 0.05)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                      />
                      <YAxis
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#incomeGradient)"
                        animationDuration={1500}
                        animationBegin={0}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No income data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card glass-card-hover">
              <CardHeader>
                <CardTitle className="text-foreground">Lesson Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of lesson statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {COLORS.map((color, index) => (
                          <linearGradient key={`pieGradient${index}`} id={`pieGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0.6}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={lessonStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1500}
                      >
                        {lessonStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#pieGradient${index})`} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <Card className="glass-card glass-card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">Advanced Filters</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lesson Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/50">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {lessonCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Group</label>
                    <Select value={groupFilter} onValueChange={setGroupFilter}>
                      <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/50">
                        <SelectValue placeholder="Select Group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Groups</SelectItem>
                        {groups.map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/50">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lesson Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/50">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="scheduled">Attended</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2 flex items-end">
                    <Button className="gap-2 bg-primary hover:bg-primary/90">
                      <Filter className="h-4 w-4" />
                      <span>Apply Filters</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Finances Tab */}
        <TabsContent value="finances" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                  <div className="p-1.5 bg-green-500/10 rounded">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${totalIncome}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  This {dateRangeFilter}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                  <div className="p-1.5 bg-red-500/10 rounded">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </div>
                  Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${totalExpenses}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  This {dateRangeFilter}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                  <div className="p-1.5 bg-blue-500/10 rounded">
                    <CircleDollarSign className="h-4 w-4 text-blue-500" />
                  </div>
                  Net Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${netCashFlow}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  This {dateRangeFilter}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                  <div className="p-1.5 bg-purple-500/10 rounded">
                    <Wallet className="h-4 w-4 text-purple-500" />
                  </div>
                  Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${totalIncome - totalExpenses}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  All accounts ({currencyFilter})
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-card glass-card-hover">
              <CardHeader>
                <CardTitle className="text-foreground">Cash Flow</CardTitle>
                <CardDescription>
                  Income vs Expenses over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={cashFlowData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="cashIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255, 255, 255, 0.05)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                      />
                      <YAxis
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="line"
                        formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#cashIncomeGradient)"
                        animationDuration={1500}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#expensesGradient)"
                        animationDuration={1500}
                        animationBegin={300}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        name="Profit"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#profitGradient)"
                        animationDuration={1500}
                        animationBegin={600}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card glass-card-hover">
              <CardHeader>
                <CardTitle className="text-foreground">Balance by Currency</CardTitle>
                <CardDescription>
                  Distribution across currencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {COLORS.map((color, index) => (
                          <linearGradient key={`currencyGradient${index}`} id={`currencyGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0.6}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={balanceByCurrencyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1500}
                      >
                        {balanceByCurrencyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#currencyGradient${index})`} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value, entry: any) => (
                          <span className="text-sm text-muted-foreground">
                            {value}: <span className="font-medium text-foreground">${entry.payload.value}</span>
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card glass-card-hover">
              <CardHeader>
                <CardTitle className="text-foreground">Upcoming Expenses</CardTitle>
                <CardDescription>
                  Expected expenses for next {dateRangeFilter}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-foreground">${upcomingExpenses}</div>
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 gap-1">
                      <ArrowUp className="h-3 w-3" />
                      <span>+5% from previous {dateRangeFilter}</span>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {expenses.length > 0 ? (
                      // Show actual expense categories
                      Object.entries(
                        expenses.reduce((acc, exp) => {
                          const category = exp.category || 'Other';
                          acc[category] = (acc[category] || 0) + exp.amount;
                          return acc;
                        }, {} as Record<string, number>)
                      )
                        .slice(0, 5)
                        .map(([category, amount]) => (
                          <div key={category} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{category}</span>
                            <span className="font-medium">${Math.round(amount)}</span>
                          </div>
                        ))
                    ) : (
                      // Show default categories when no data
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">No expense data</span>
                          <span className="font-medium">$0</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card glass-card-hover">
              <CardHeader>
                <CardTitle className="text-foreground">Expected Income</CardTitle>
                <CardDescription>
                  Projected income for next {dateRangeFilter}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-foreground">${upcomingIncome}</div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 gap-1">
                      <ArrowUp className="h-3 w-3" />
                      <span>+8% from previous {dateRangeFilter}</span>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {expectedPayments.length > 0 ? (
                      expectedPayments
                        .slice(0, 5)
                        .map((payment) => (
                          <div key={payment.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {payment.description || 'Payment'}
                            </span>
                            <span className="font-medium">${payment.amount}</span>
                          </div>
                        ))
                    ) : sessions.length > 0 ? (
                      // Show session-based income projection
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Projected from sessions</span>
                        <span className="font-medium">${upcomingIncome}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">No upcoming payments</span>
                        <span className="font-medium">$0</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <StudentsOverviewCards
            newStudents={totalNewStudents}
            lostStudents={totalLostStudents}
            newStudentIncome={totalNewStudents * 300}
            lostROI={totalLostStudents * 250}
            period={dateRangeFilter}
            className="mb-6"
          />
          
          <StudentAcquisitionChart
            data={studentMetricsData}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SubjectPerformanceCard 
              subjects={subjects}
            />
            
            <ROIByLessonTypeCard
              data={roiData}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatesReports;

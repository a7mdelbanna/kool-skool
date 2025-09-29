import React, { useState, useContext, useEffect } from 'react';
import { PlusCircle, Calendar, Filter, Layout, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import EnhancedDashboardStats from '@/components/EnhancedDashboardStats';
import RevenueExpensesChart from '@/components/RevenueExpensesChart';
import NewStudentsStats from '@/components/NewStudentsStats';
import DashboardStats from '@/components/DashboardStats';
import StudentCard, { Student } from '@/components/StudentCard';
import UpcomingLessons, { Lesson } from '@/components/UpcomingLessons';
import UpcomingPayments, { Payment } from '@/components/UpcomingPayments';
import AddStudentDialog from '@/components/AddStudentDialog';
import QuickActionsBar from '@/components/dashboard/QuickActionsBar';
import UrgentActionsWidget from '@/components/dashboard/UrgentActionsWidget';
import BusinessHealthMonitor from '@/components/dashboard/BusinessHealthMonitor';
import TodaysFocusWidget from '@/components/dashboard/TodaysFocusWidget';
import InsightsWidget from '@/components/dashboard/InsightsWidget';
import LiveUpdatesIndicator from '@/components/dashboard/LiveUpdatesIndicator';
import CashFlowWidget from '@/components/dashboard/CashFlowWidget';
import MobileResponsiveDashboard from '@/components/dashboard/MobileResponsiveDashboard';
import EnhancedDashboardHeader from '@/components/dashboard/EnhancedDashboardHeader';
import { toast } from 'sonner';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { UserContext } from '@/App';
import { dashboardService, RecentStudent, UpcomingLesson } from '@/services/dashboard.service';
import { useNavigate } from 'react-router-dom';

// Sample data for demonstration
const sampleStudents: Student[] = [
  {
    id: '1',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.j@example.com',
    courseName: 'English Conversation',
    lessonType: 'individual',
    ageGroup: 'adult',
    level: 'beginner',
    lessonsCompleted: 12,
    nextLesson: 'Today, 4 PM',
    paymentStatus: 'paid',
    nextPaymentDate: '2023-10-15'
  },
  {
    id: '2',
    firstName: 'Sophia',
    lastName: 'Chen',
    email: 'sophia.c@example.com',
    courseName: 'Business English',
    lessonType: 'group',
    ageGroup: 'adult',
    level: 'intermediate',
    lessonsCompleted: 8,
    nextLesson: 'Tomorrow, 3 PM',
    paymentStatus: 'pending',
    nextPaymentDate: '2023-10-20'
  },
  {
    id: '3',
    firstName: 'Michael',
    lastName: 'Davis',
    email: 'michael.d@example.com',
    courseName: 'IELTS Preparation',
    lessonType: 'individual',
    ageGroup: 'adult',
    level: 'advanced',
    lessonsCompleted: 15,
    nextLesson: 'Friday, 5 PM',
    paymentStatus: 'overdue',
    nextPaymentDate: '2023-10-05'
  },
  {
    id: '4',
    firstName: 'Emma',
    lastName: 'Wilson',
    email: 'emma.w@example.com',
    courseName: 'TOEFL Preparation',
    lessonType: 'individual',
    ageGroup: 'adult',
    level: 'advanced',
    lessonsCompleted: 6,
    nextLesson: 'Today, 6 PM',
    paymentStatus: 'paid',
    nextPaymentDate: '2023-10-25'
  },
];

const sampleLessons: Lesson[] = [
  {
    id: '1',
    studentName: 'Alex Johnson',
    subject: 'Mathematics - Calculus',
    date: 'Today',
    time: '4:00 PM',
    duration: '1 hour',
    status: 'upcoming'
  },
  {
    id: '2',
    studentName: 'Emma Wilson',
    subject: 'Physics - Mechanics',
    date: 'Today',
    time: '6:00 PM',
    duration: '1 hour',
    status: 'upcoming'
  },
  {
    id: '3',
    studentName: 'Sophia Chen',
    subject: 'Science - Chemistry',
    date: 'Tomorrow',
    time: '3:00 PM',
    duration: '1 hour',
    status: 'upcoming'
  },
  {
    id: '4',
    studentName: 'Ryan Murphy',
    subject: 'Computer Science',
    date: 'Today',
    time: '2:00 PM',
    duration: '1 hour',
    status: 'completed'
  },
];

const samplePayments: Payment[] = [
  {
    id: '1',
    studentName: 'Michael Davis',
    amount: 150,
    dueDate: new Date(),
    subject: 'English Literature',
    status: 'pending'
  },
  {
    id: '2',
    studentName: 'Noah Martinez',
    amount: 180,
    dueDate: new Date(),
    subject: 'Chemistry',
    status: 'overdue'
  },
  {
    id: '3',
    studentName: 'William Taylor',
    amount: 120,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    subject: 'Physics',
    status: 'pending'
  },
  {
    id: '4',
    studentName: 'Sophia Chen',
    amount: 90,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    subject: 'Science',
    status: 'pending'
  },
  {
    id: '5',
    studentName: 'Emma Wilson',
    amount: 135,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 3)),
    subject: 'Physics',
    status: 'pending'
  },
  {
    id: '6',
    studentName: 'Alex Johnson',
    amount: 165,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 4)),
    subject: 'Mathematics',
    status: 'pending'
  }
];

const Index = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<'standard' | 'enhanced' | 'custom' | 'responsive'>('responsive');
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (user?.schoolId) {
        // Fetch recent students
        setLoadingStudents(true);
        try {
          const students = await dashboardService.getRecentStudents(user.schoolId, 4);
          // Convert to StudentCard format
          const formattedStudents: Student[] = students.map(s => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            courseName: s.courseName,
            lessonType: s.lessonType,
            ageGroup: s.ageGroup,
            level: s.level,
            lessonsCompleted: s.lessonsCompleted,
            nextLesson: s.nextLesson,
            paymentStatus: s.paymentStatus as any,
            nextPaymentDate: s.nextPaymentDate
          }));
          setRecentStudents(formattedStudents);
        } catch (error) {
          console.error('Error fetching recent students:', error);
          setRecentStudents([]);
        } finally {
          setLoadingStudents(false);
        }

        // Fetch upcoming lessons
        setLoadingLessons(true);
        try {
          const lessons = await dashboardService.getUpcomingLessons(user.schoolId, 5);
          // Convert to UpcomingLessons format
          const formattedLessons: Lesson[] = lessons.map(l => ({
            id: l.id,
            studentName: l.studentName,
            subject: l.subject,
            date: l.date,
            time: l.time,
            duration: l.duration,
            status: l.status
          }));
          setUpcomingLessons(formattedLessons);
        } catch (error) {
          console.error('Error fetching upcoming lessons:', error);
          setUpcomingLessons([]);
        } finally {
          setLoadingLessons(false);
        }
      }
    };

    fetchDashboardData();
  }, [user?.schoolId]);
  
  return (
    <div className="animate-fade-in -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-12 2xl:-mx-16 -mt-6">
      {/* Enhanced Header with Search */}
      <EnhancedDashboardHeader />

      {/* Dashboard Content */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 pb-6 space-y-6">
        {/* View Switcher */}
        <div className="flex justify-end">
          <Tabs defaultValue="responsive" className="hidden md:block" onValueChange={(value) => setView(value as any)}>
            <TabsList className="bg-white/10 backdrop-blur-sm">
              <TabsTrigger value="responsive" className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-300">
                Responsive
              </TabsTrigger>
              <TabsTrigger value="custom" className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-300">
                <Grid className="h-4 w-4 mr-2" />
                Custom
              </TabsTrigger>
              <TabsTrigger value="enhanced" className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-300">
                <Layout className="h-4 w-4 mr-2" />
                Enhanced
              </TabsTrigger>
              <TabsTrigger value="standard" className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-300">
                Standard
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile Responsive View */}
        {view === 'responsive' && (
          <MobileResponsiveDashboard
            lessons={loadingLessons ? [] : upcomingLessons}
            payments={samplePayments}
          />
        )}

        {/* Custom Drag & Drop View - Temporarily disabled due to React version conflicts */}
        {view === 'custom' && (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Custom View Temporarily Unavailable</h2>
            <p className="text-muted-foreground">The drag-and-drop functionality is being updated. Please use the Responsive or Enhanced views.</p>
          </div>
        )}

        {/* Enhanced View */}
        {view === 'enhanced' && (
          <>
            {/* Live Updates Indicator */}
            <LiveUpdatesIndicator />

            {/* Quick Actions Bar */}
            <QuickActionsBar />

            {/* Business Health Monitor */}
            <BusinessHealthMonitor />

            {/* Main Grid Layout - Now with two rows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* First Row - Two widgets */}
              <div className="lg:col-span-1">
                <UrgentActionsWidget />
              </div>

              <div className="lg:col-span-1">
                <TodaysFocusWidget />
              </div>
            </div>

            {/* Second Row - Cash Flow and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-1">
                <CashFlowWidget />
              </div>

              <div className="lg:col-span-1">
                <InsightsWidget />
              </div>
            </div>

            {/* Financial Intelligence Panel */}
            <div className="glass-card glass-card-hover p-6 rounded-xl">
              <RevenueExpensesChart />
            </div>

            {/* Recent Activities & Upcoming Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Recent Students</h2>
                  <Button variant="link" className="text-primary hover:text-primary/80" onClick={() => navigate('/students')}>View All</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 element-transition">
                  {loadingStudents ? (
                    [...Array(4)].map((_, i) => (
                      <div key={i} className="glass-card animate-pulse h-[150px] rounded-xl"></div>
                    ))
                  ) : recentStudents.length > 0 ? (
                    recentStudents.map(student => (
                      <StudentCard key={student.id} student={student} className="glass-card glass-card-hover" />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      No students found. <Button variant="link" className="text-primary hover:text-primary/80" onClick={() => navigate('/students')}>Add your first student</Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <UpcomingLessons lessons={loadingLessons ? [] : upcomingLessons} className="glass-card glass-card-hover" />
                <UpcomingPayments payments={samplePayments} className="glass-card glass-card-hover" />
              </div>
            </div>
          </>
        )}

        {/* Legacy Stats View */}
        {view === 'standard' && <DashboardStats />}
      </div>
    </div>
  );
};

export default Index;

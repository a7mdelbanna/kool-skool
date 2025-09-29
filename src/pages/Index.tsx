import React, { useState, useContext, useEffect } from 'react';
import { PlusCircle, Calendar, Filter } from 'lucide-react';
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
  const [view, setView] = useState<'standard' | 'enhanced'>('enhanced');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
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
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back, let's manage your tutoring business!</p>
        </div>
        
        <div className="flex gap-2">
          <Tabs defaultValue="enhanced" className="hidden md:block" onValueChange={(value) => setView(value as 'standard' | 'enhanced')}>
            <TabsList>
              <TabsTrigger value="enhanced">Enhanced View</TabsTrigger>
              <TabsTrigger value="standard">Standard View</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Filters</h4>
                  <p className="text-sm text-muted-foreground">
                    Customize your dashboard view
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" className="justify-center">
                      Daily
                    </Button>
                    <Button variant="default" size="sm" className="justify-center">
                      Weekly
                    </Button>
                    <Button variant="outline" size="sm" className="justify-center">
                      Monthly
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setIsAddStudentOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            <span>New Student</span>
          </Button>
        </div>
      </div>
      
      {view === 'enhanced' ? <EnhancedDashboardStats /> : <DashboardStats />}
      
      {view === 'enhanced' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 element-transition">
          <div className="lg:col-span-2">
            <div className="glass-card glass-card-hover p-6 rounded-xl">
              <RevenueExpensesChart />
            </div>
          </div>
          <div>
            <div className="glass-card glass-card-hover p-6 rounded-xl">
              <NewStudentsStats />
            </div>
          </div>
        </div>
      )}
      
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
      
      <PaymentProvider>
        <AddStudentDialog 
          open={isAddStudentOpen} 
          onOpenChange={setIsAddStudentOpen}
          onStudentAdded={(student) => {
            setIsAddStudentOpen(false);
            toast.success(`Student ${student.firstName} ${student.lastName} added successfully`);
          }}
        />
      </PaymentProvider>
    </div>
  );
};

export default Index;

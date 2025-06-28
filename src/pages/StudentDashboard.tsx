
import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserContext } from '@/App';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, BookOpen, Calendar, CreditCard, Clock, CheckCircle, AlertCircle, Settings, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { formatInUserTimezone, getEffectiveTimezone, getBrowserTimezone } from '@/utils/timezone';
import TimezoneSelector from '@/components/TimezoneSelector';
import SessionTimeDisplay from '@/components/SessionTimeDisplay';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  course_name: string;
  lesson_type: string;
  teacher_first_name: string;
  teacher_last_name: string;
  next_session_date: string | null;
  subscription_progress: string;
}

interface Subscription {
  id: string;
  session_count: number;
  duration_months: number;
  start_date: string;
  end_date: string | null;
  total_price: number;
  currency: string;
  status: string;
  sessions_completed: number;
}

interface Session {
  id: string;
  scheduled_date: string;
  duration_minutes: number;
  status: string;
  cost: number;
  notes: string | null;
}

const StudentDashboard = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTimezone, setUserTimezone] = useState<string>('');
  const [timezoneDialogOpen, setTimezoneDialogOpen] = useState(false);

  // Force re-render when user timezone changes
  const currentUserTimezone = getEffectiveTimezone(user?.timezone);

  useEffect(() => {
    console.log('StudentDashboard - User timezone changed:', currentUserTimezone);
    setUserTimezone(currentUserTimezone);
  }, [currentUserTimezone]);

  useEffect(() => {
    // Check if user is authenticated and is a student
    if (!user || user.role !== 'student') {
      console.log('Non-student or unauthenticated user, redirecting to student login...');
      navigate('/student-login');
      return;
    }
    
    console.log('StudentDashboard - Initial load with user:', user);
    fetchStudentData();
  }, [user, navigate]);

  const fetchStudentData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      console.log('=== FETCHING STUDENT DATA ===');
      console.log('User ID:', user.id);
      console.log('School ID:', user.schoolId);
      
      // First, get the student record to get the student ID
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          school_id,
          user_id,
          course_id,
          teacher_id,
          age_group,
          level,
          phone,
          next_payment_date,
          next_payment_amount,
          courses:course_id (
            name,
            lesson_type
          ),
          users!students_teacher_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('user_id', user.id)
        .single();
      
      if (studentsError) {
        console.error('Error fetching student:', studentsError);
        toast.error('Failed to load student data');
        return;
      }
      
      console.log('Student data:', students);
      
      if (students) {
        // Fetch subscriptions for this student to get progress info
        const subscriptionsData = await fetchSubscriptions(students.id);
        
        // Fetch sessions for this student to get the next session date
        const sessionsData = await fetchSessions(students.id);
        
        // Find the next scheduled session
        const nextSession = sessionsData
          .filter(session => session.status === 'scheduled' && new Date(session.scheduled_date) >= new Date())
          .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0];
        
        // Calculate subscription progress from active subscription
        let progressText = '0/0';
        const activeSubscription = subscriptionsData.find(sub => sub.status === 'active');
        
        if (activeSubscription) {
          console.log('Active subscription found:', activeSubscription);
          console.log('Total sessions in subscription:', activeSubscription.session_count);
          
          // Count sessions that are marked as completed or cancelled for this specific subscription
          const completedSessions = sessionsData.filter(session => 
            (session.status === 'completed' || session.status === 'cancelled')
          ).length;
          
          console.log('Completed/cancelled sessions:', completedSessions);
          progressText = `${completedSessions}/${activeSubscription.session_count}`;
        } else {
          console.log('No active subscription found');
        }
        
        console.log('Final progress text:', progressText);
        
        const formattedStudentData: StudentData = {
          id: students.id,
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          course_name: students.courses?.name || 'No course assigned',
          lesson_type: students.courses?.lesson_type || 'N/A',
          teacher_first_name: students.users?.first_name || 'No teacher',
          teacher_last_name: students.users?.last_name || 'assigned',
          next_session_date: nextSession?.scheduled_date || null,
          subscription_progress: progressText
        };
        
        setStudentData(formattedStudentData);
      }
      
    } catch (error) {
      console.error('Error in fetchStudentData:', error);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async (studentId: string) => {
    try {
      console.log('=== FETCHING SUBSCRIPTIONS ===');
      console.log('Student ID:', studentId);
      
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      
      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
        return [];
      }
      
      console.log('Subscriptions data:', subscriptionsData);
      setSubscriptions(subscriptionsData || []);
      return subscriptionsData || [];
      
    } catch (error) {
      console.error('Error in fetchSubscriptions:', error);
      return [];
    }
  };

  const fetchSessions = async (studentId: string) => {
    try {
      console.log('=== FETCHING SESSIONS ===');
      console.log('Student ID:', studentId);
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('lesson_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('scheduled_date', { ascending: true });
      
      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        return [];
      }
      
      console.log('Sessions data:', sessionsData);
      setSessions(sessionsData || []);
      return sessionsData || [];
      
    } catch (error) {
      console.error('Error in fetchSessions:', error);
      return [];
    }
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    try {
      console.log('=== TIMEZONE CHANGE DEBUG ===');
      console.log('Old timezone:', userTimezone);
      console.log('New timezone:', newTimezone);
      console.log('Current user:', user);
      
      // Update in database
      const { error } = await supabase
        .from('users')
        .update({ timezone: newTimezone, updated_at: new Date().toISOString() })
        .eq('id', user?.id);

      if (error) {
        console.error('Error updating timezone in database:', error);
        toast.error('Failed to update timezone');
        return;
      }

      console.log('Successfully updated timezone in database');

      // Update user context immediately
      if (user) {
        const updatedUser = { ...user, timezone: newTimezone };
        console.log('Updating user context with:', updatedUser);
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // Update local state
      setUserTimezone(newTimezone);
      setTimezoneDialogOpen(false);
      
      toast.success('Timezone updated successfully');
      
      console.log('Timezone change completed successfully');
      
    } catch (error) {
      console.error('Error in handleTimezoneChange:', error);
      toast.error('Failed to update timezone');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('storage'));
    toast.success('Logged out successfully');
    navigate('/student-login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'student' || !studentData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold">Unable to load student data</p>
          <Button onClick={() => navigate('/student-login')} className="mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const upcomingSessions = sessions.filter(
    session => session.status === 'scheduled' && new Date(session.scheduled_date) >= new Date()
  ).slice(0, 3);

  const recentSessions = sessions.filter(
    session => session.status !== 'scheduled' || new Date(session.scheduled_date) < new Date()
  ).slice(0, 3);

  console.log('StudentDashboard - Rendering with timezone:', userTimezone);
  console.log('StudentDashboard - Upcoming sessions:', upcomingSessions);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Welcome, {studentData.first_name}!
                </h1>
                <p className="text-sm text-gray-500">Student Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={timezoneDialogOpen} onOpenChange={setTimezoneDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {userTimezone || 'Set Timezone'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Select Your Timezone</DialogTitle>
                    <DialogDescription>
                      Choose your timezone to view all session times in your local time.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <TimezoneSelector
                      value={userTimezone}
                      onValueChange={handleTimezoneChange}
                      placeholder="Select your timezone"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your student information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-500">Name:</span>
                <p className="text-sm">{studentData.first_name} {studentData.last_name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <p className="text-sm">{studentData.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Timezone:</span>
                <p className="text-sm">{userTimezone || getBrowserTimezone()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Role:</span>
                <Badge variant="secondary" className="ml-2">Student</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Course Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                My Course
              </CardTitle>
              <CardDescription>Your enrolled course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-500">Course:</span>
                <p className="text-sm font-semibold">{studentData.course_name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Lesson Type:</span>
                <p className="text-sm">{studentData.lesson_type}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Teacher:</span>
                <p className="text-sm">{studentData.teacher_first_name} {studentData.teacher_last_name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Progress:</span>
                <Badge variant="outline" className="ml-2">{studentData.subscription_progress}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Next Session Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Next Session
              </CardTitle>
              <CardDescription>Your upcoming lesson</CardDescription>
            </CardHeader>
            <CardContent>
              {studentData.next_session_date ? (
                <div className="space-y-2">
                  <SessionTimeDisplay 
                    date={studentData.next_session_date} 
                    className="text-sm font-semibold"
                    key={`next-session-${userTimezone}`}
                  />
                  <Badge className="bg-green-100 text-green-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Scheduled
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upcoming sessions scheduled
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions Section */}
        {subscriptions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Current Subscriptions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{subscription.session_count} Sessions - {subscription.duration_months} Month(s)</span>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Start Date: <SessionTimeDisplay date={subscription.start_date} showTime={false} key={`sub-start-${subscription.id}-${userTimezone}`} />
                      {subscription.end_date && (
                        <span> - End Date: <SessionTimeDisplay date={subscription.end_date} showTime={false} key={`sub-end-${subscription.id}-${userTimezone}`} /></span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Price:</span>
                        <span className="text-sm font-semibold">{subscription.currency} {subscription.total_price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Progress:</span>
                        <span className="text-sm">{subscription.sessions_completed || 0}/{subscription.session_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Sessions Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled lessons</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div key={session.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <SessionTimeDisplay 
                            date={session.scheduled_date} 
                            className="font-medium"
                            showTime={false}
                            key={`upcoming-date-${session.id}-${userTimezone}`}
                          />
                          <p className="text-sm text-gray-500">
                            <SessionTimeDisplay 
                              date={session.scheduled_date} 
                              showDate={false}
                              key={`upcoming-time-${session.id}-${userTimezone}`}
                            /> • {session.duration_minutes} min
                          </p>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                      {session.notes && (
                        <p className="text-xs text-gray-500 mt-2">{session.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming sessions</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your completed lessons</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <SessionTimeDisplay 
                            date={session.scheduled_date} 
                            className="font-medium"
                            showTime={false}
                            key={`recent-date-${session.id}-${userTimezone}`}
                          />
                          <p className="text-sm text-gray-500">
                            <SessionTimeDisplay 
                              date={session.scheduled_date} 
                              showDate={false}
                              key={`recent-time-${session.id}-${userTimezone}`}
                            /> • {session.duration_minutes} min
                          </p>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                      {session.notes && (
                        <p className="text-xs text-gray-500 mt-2">{session.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent sessions</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <div className="mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to your Student Portal!
                </h2>
                <p className="text-gray-600">
                  This is your personal dashboard where you can view your courses, schedule, 
                  and track your learning progress. All times are displayed in your personal timezone ({userTimezone}).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

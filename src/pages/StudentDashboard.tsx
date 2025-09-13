
import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserContext } from '@/App';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, BookOpen, Calendar, CreditCard, Clock, CheckCircle, AlertCircle, Settings, Globe, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { databaseService } from '@/services/firebase/database.service';
import { sessionGeneratorService } from '@/services/firebase/sessionGenerator.service';
import { createTestSession } from '@/utils/testSessionCreator';
import { StudentPaymentUpload } from '@/components/StudentPaymentUpload';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

// Session Card Component
const SessionCard = ({ 
  session, 
  userTimezone, 
  onCancelRequest 
}: { 
  session: any; 
  userTimezone: string; 
  onCancelRequest: (id: string) => void;
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const canCancel = sessionGeneratorService.canCancelSession(session);
  const cancellationMessage = sessionGeneratorService.getCancellationDeadlineMessage(session);
  
  return (
    <div className="border rounded-md p-3">
      <div 
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <SessionTimeDisplay 
              date={session.scheduled_date || session.scheduledDate} 
              className="font-medium"
              showTime={false}
              key={`date-${session.id}-${userTimezone}`}
            />
            <p className="text-sm text-gray-500">
              <SessionTimeDisplay 
                date={session.scheduled_date || session.scheduledDate} 
                showDate={false}
                key={`time-${session.id}-${userTimezone}`}
              /> • {session.duration_minutes || session.durationMinutes || 60} min
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Session {session.session_number || session.sessionNumber || '?'} of {session.total_sessions || session.totalSessions || '?'}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant={session.status === 'scheduled' ? 'default' : 'secondary'}>
              {session.status}
            </Badge>
            {session.status === 'scheduled' && (
              <div className="text-right">
                <p className="text-xs text-gray-500">{cancellationMessage}</p>
                <Button 
                  size="sm" 
                  variant={canCancel ? "outline" : "ghost"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canCancel) {
                      onCancelRequest(session.id);
                    }
                  }}
                  disabled={!canCancel}
                  className="text-xs mt-1"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  {canCancel ? 'Request Cancellation' : 'Past Deadline'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2">
          {session.notes && (
            <div>
              <p className="text-xs font-medium text-gray-600">Notes:</p>
              <p className="text-xs text-gray-500">{session.notes}</p>
            </div>
          )}
          {session.materials && (
            <div>
              <p className="text-xs font-medium text-gray-600">Materials:</p>
              <p className="text-xs text-gray-500">{session.materials}</p>
            </div>
          )}
          {session.homework && (
            <div>
              <p className="text-xs font-medium text-gray-600">Homework:</p>
              <p className="text-xs text-gray-500">{session.homework}</p>
            </div>
          )}
          {!session.notes && !session.materials && !session.homework && (
            <p className="text-xs text-gray-400 italic">No additional details available</p>
          )}
        </div>
      )}
    </div>
  );
};

const StudentDashboard = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTimezone, setUserTimezone] = useState<string>('');
  const [timezoneDialogOpen, setTimezoneDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [paymentUploadOpen, setPaymentUploadOpen] = useState(false);
  const [selectedSubscriptionForPayment, setSelectedSubscriptionForPayment] = useState<any>(null);

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
      
      // First, get the student record by checking both userId and id fields
      // The student document ID might be the same as the user ID, or it might have a userId field
      let studentDoc = null;
      
      // First try to get student by document ID matching user ID
      try {
        studentDoc = await databaseService.getById('students', user.id);
        console.log('Found student by document ID:', studentDoc);
      } catch (error) {
        console.log('Student not found by document ID, trying by userId field...');
      }
      
      // If not found, query by userId field
      if (!studentDoc) {
        const studentsQuery = await databaseService.query('students', {
          where: [{ field: 'userId', operator: '==', value: user.id }]
        });
        
        if (studentsQuery && studentsQuery.length > 0) {
          studentDoc = studentsQuery[0];
          console.log('Found student by userId field:', studentDoc);
        }
      }
      
      // If still not found, query by user_id field (for backward compatibility)
      if (!studentDoc) {
        const studentsQuery = await databaseService.query('students', {
          where: [{ field: 'user_id', operator: '==', value: user.id }]
        });
        
        if (studentsQuery && studentsQuery.length > 0) {
          studentDoc = studentsQuery[0];
          console.log('Found student by user_id field:', studentDoc);
        }
      }
      
      if (!studentDoc) {
        console.error('No student record found for user:', user.id);
        toast.error('Student profile not found. Please contact your administrator.');
        return;
      }
      
      console.log('Student data:', studentDoc);
      
      // Fetch teacher data if teacher ID exists
      let teacherData = null;
      if (studentDoc.teacherId || studentDoc.teacher_id) {
        const teacherId = studentDoc.teacherId || studentDoc.teacher_id;
        try {
          teacherData = await databaseService.getById('users', teacherId);
          console.log('Teacher data:', teacherData);
        } catch (error) {
          console.error('Error fetching teacher:', error);
        }
      }
      
      // Format the student data to match the expected structure
      const students = {
        id: studentDoc.id,
        school_id: studentDoc.schoolId || studentDoc.school_id,
        user_id: studentDoc.userId || studentDoc.user_id || user.id,
        course_id: studentDoc.courseId || studentDoc.course_id,
        teacher_id: studentDoc.teacherId || studentDoc.teacher_id,
        age_group: studentDoc.ageGroup || studentDoc.age_group,
        level: studentDoc.level,
        phone: studentDoc.phone,
        next_payment_date: studentDoc.nextPaymentDate || studentDoc.next_payment_date,
        next_payment_amount: studentDoc.nextPaymentAmount || studentDoc.next_payment_amount,
        courses: {
          name: studentDoc.courseName || studentDoc.course_name,
          lesson_type: studentDoc.lessonType || studentDoc.lesson_type
        },
        users: teacherData ? {
          first_name: teacherData.firstName || teacherData.first_name,
          last_name: teacherData.lastName || teacherData.last_name,
          email: teacherData.email
        } : null
      };
      
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
        let progressPercentage = 0;
        const activeSubscription = subscriptionsData.find(sub => sub.status === 'active');
        
        if (activeSubscription) {
          console.log('Active subscription found:', activeSubscription);
          const totalSessions = activeSubscription.session_count || activeSubscription.sessionCount || 0;
          console.log('Total sessions in subscription:', totalSessions);
          
          // Count sessions that are marked as completed or cancelled for this specific subscription
          const completedSessions = sessionsData.filter(session => 
            (session.status === 'completed' || session.status === 'cancelled')
          ).length;
          
          console.log('Completed/cancelled sessions:', completedSessions);
          progressText = `${completedSessions}/${totalSessions}`;
          progressPercentage = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
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
      
      // Query subscriptions by student_id or studentId field
      let subscriptionsData = await databaseService.query('subscriptions', {
        where: [{ field: 'student_id', operator: '==', value: studentId }]
      });
      
      // If no results, try with camelCase field name
      if (!subscriptionsData || subscriptionsData.length === 0) {
        subscriptionsData = await databaseService.query('subscriptions', {
          where: [{ field: 'studentId', operator: '==', value: studentId }]
        });
      }
      
      // Sort by created_at descending
      if (subscriptionsData && subscriptionsData.length > 0) {
        subscriptionsData.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
          const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
          return dateB - dateA; // Descending order
        });
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
      
      // Try to fetch ALL sessions first to debug
      console.log('Fetching all sessions from lesson_sessions collection...');
      const allSessions = await databaseService.getAll('lesson_sessions');
      console.log('Total sessions in collection:', allSessions?.length || 0);
      
      if (allSessions && allSessions.length > 0) {
        console.log('Sample session structure:', allSessions[0]);
        console.log('Student IDs in sessions:', allSessions.map((s: any) => s.student_id || s.studentId));
      }
      
      // Query sessions by student_id or studentId field
      let sessionsData = await databaseService.query('lesson_sessions', {
        where: [{ field: 'student_id', operator: '==', value: studentId }]
      });
      
      console.log('Sessions found with student_id query:', sessionsData?.length || 0);
      
      // If no results, try with camelCase field name
      if (!sessionsData || sessionsData.length === 0) {
        console.log('Trying with camelCase field name...');
        sessionsData = await databaseService.query('lesson_sessions', {
          where: [{ field: 'studentId', operator: '==', value: studentId }]
        });
        console.log('Sessions found with studentId query:', sessionsData?.length || 0);
      }
      
      // Filter sessions manually as a fallback
      if ((!sessionsData || sessionsData.length === 0) && allSessions) {
        console.log('Filtering sessions manually...');
        sessionsData = allSessions.filter((s: any) => 
          s.student_id === studentId || s.studentId === studentId
        );
        console.log('Sessions found with manual filter:', sessionsData?.length || 0);
      }
      
      // Sort by scheduled_date ascending
      if (sessionsData && sessionsData.length > 0) {
        sessionsData.sort((a: any, b: any) => {
          const dateA = new Date(a.scheduled_date || a.scheduledDate || 0).getTime();
          const dateB = new Date(b.scheduled_date || b.scheduledDate || 0).getTime();
          return dateA - dateB; // Ascending order
        });
      }
      
      console.log('Final sessions data:', sessionsData);
      setSessions(sessionsData || []);
      return sessionsData || [];
      
    } catch (error) {
      console.error('Error in fetchSessions:', error);
      console.error('Error details:', error);
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

  const handleCancellationRequest = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCancellationDialogOpen(true);
  };

  const confirmCancellation = async () => {
    if (!selectedSessionId) return;
    
    try {
      // Update session status to cancellation_requested
      await databaseService.update('lesson_sessions', selectedSessionId, {
        status: 'cancellation_requested',
        cancellation_requested_at: new Date().toISOString(),
        cancellation_reason: 'Student requested cancellation',
        updatedAt: new Date().toISOString()
      });
      
      toast.success('Cancellation request sent to your teacher');
      
      // Refresh sessions
      if (studentData) {
        await fetchSessions(studentData.id);
      }
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      toast.error('Failed to request cancellation');
    } finally {
      setCancellationDialogOpen(false);
      setSelectedSessionId(null);
    }
  };

  const handleMakePayment = (subscriptionId: string) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (subscription) {
      setSelectedSubscriptionForPayment(subscription);
      setPaymentUploadOpen(true);
    } else {
      toast.error('Subscription not found');
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
    session => session.status === 'scheduled' && new Date(session.scheduled_date || session.scheduledDate) >= new Date()
  );

  const recentSessions = sessions.filter(
    session => session.status !== 'scheduled' || new Date(session.scheduled_date || session.scheduledDate) < new Date()
  );

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
                  Welcome, {studentData?.first_name || studentData?.firstName || 'Student'}!
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
                      <span>{subscription.session_count || subscription.sessionCount || 0} Sessions - {subscription.duration_months || subscription.durationMonths || 0} Month(s)</span>
                      <Badge variant={(subscription.status || 'pending') === 'active' ? 'default' : 'secondary'}>
                        {subscription.status || 'pending'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Start Date: <SessionTimeDisplay date={subscription.start_date || subscription.startDate} showTime={false} key={`sub-start-${subscription.id}-${userTimezone}`} />
                      {(subscription.end_date || subscription.endDate) && (
                        <span> - End Date: <SessionTimeDisplay date={subscription.end_date || subscription.endDate} showTime={false} key={`sub-end-${subscription.id}-${userTimezone}`} /></span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Price:</span>
                        <span className="text-sm font-semibold">
                          {subscription.currency || 'USD'} {((subscription.total_price || subscription.totalPrice || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Progress:</span>
                        <span className="text-sm">
                          {subscription.sessions_completed || subscription.sessionsCompleted || 0}/
                          {subscription.session_count || subscription.sessionCount || 0}
                        </span>
                      </div>
                      {/* Show payment button if subscription is active or if there's an outstanding balance */}
                      {(subscription.status === 'active' || subscription.status === 'overdue' || 
                        subscription.payment_status === 'pending' || subscription.payment_status === 'partial' ||
                        subscription.payment_status === 'unpaid' || !subscription.payment_status) && (
                        <Button 
                          className="w-full mt-3" 
                          variant="default"
                          onClick={() => handleMakePayment(subscription.id)}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Make Payment
                        </Button>
                      )}
                      
                      {/* Show session count for this subscription */}
                      <div className="mt-2 text-xs text-gray-500">
                        Sessions: {sessions.filter(s => 
                          (s.subscription_id === subscription.id || s.subscriptionId === subscription.id)
                        ).length} found
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
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Upcoming Sessions</CardTitle>
                  <CardDescription>Your scheduled lessons</CardDescription>
                </div>
                {/* Debug button - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const activeSubscription = subscriptions.find(sub => sub.status === 'active') || subscriptions[0];
                      if (studentData && activeSubscription) {
                        try {
                          const sessionId = await createTestSession(
                            studentData.id,
                            activeSubscription.id,
                            studentData.school_id || studentData.schoolId || ''
                          );
                          toast.success('Test session created!');
                          await fetchSessions(studentData.id);
                        } catch (error) {
                          toast.error('Failed to create test session');
                        }
                      } else {
                        toast.error('No subscription found for test session');
                      }
                    }}
                  >
                    Test Session
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2">
                    Showing {upcomingSessions.length} upcoming session{upcomingSessions.length !== 1 ? 's' : ''}
                  </p>
                  {upcomingSessions.map((session) => (
                    <SessionCard 
                      key={session.id}
                      session={session}
                      userTimezone={userTimezone}
                      onCancelRequest={handleCancellationRequest}
                    />
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
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2">
                    Showing {recentSessions.length} past/completed session{recentSessions.length !== 1 ? 's' : ''}
                  </p>
                  {recentSessions.map((session) => (
                    <SessionCard 
                      key={session.id}
                      session={session}
                      userTimezone={userTimezone}
                      onCancelRequest={handleCancellationRequest}
                    />
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

      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={cancellationDialogOpen} onOpenChange={setCancellationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Session Cancellation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a cancellation request to your teacher. The teacher will review and confirm the cancellation.
              Please note that cancellation policies may apply based on your agreement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Session</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancellation}>
              Send Cancellation Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Upload Dialog */}
      {selectedSubscriptionForPayment && (
        <StudentPaymentUpload
          open={paymentUploadOpen}
          onOpenChange={setPaymentUploadOpen}
          subscriptionId={selectedSubscriptionForPayment.id}
          studentId={studentData?.id || ''}
          amount={selectedSubscriptionForPayment.total_price || selectedSubscriptionForPayment.totalPrice || 0}
          currency={selectedSubscriptionForPayment.currency || 'USD'}
          onSuccess={() => {
            // Refresh payment data
            if (studentData) {
              fetchSubscriptions(studentData.id);
            }
            toast.success('Payment submitted successfully!');
          }}
        />
      )}
    </div>
  );
};

export default StudentDashboard;

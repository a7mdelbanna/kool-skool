
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Calendar, DollarSign, Clock, Plus, User, Trash2, BookOpen, CheckCircle, ChevronDown, ChevronUp, Check, X, RefreshCw, MoveRight, ExternalLink, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { UserContext } from '@/App';
import { useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import AddStudentToGroupDialog from './AddStudentToGroupDialog';
import GroupSubscriptionsTab from './group-tabs/GroupSubscriptionsTab';
import GroupPaymentsTab from './group-tabs/GroupPaymentsTab';

interface Group {
  id: string;
  name: string;
  description: string;
  teacher_id: string;
  teacher_name: string;
  session_count: number;
  schedule: any;
  currency: string;
  price_mode: string;
  price_per_session: number;
  total_price: number;
  prices_by_currency?: { [currencyCode: string]: { per_session: number; total: number; symbol?: string } };
  status: string;
  student_count: number;
  created_at: string;
}

interface GroupStudent {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  status: string;
  start_date: string;
}

interface ActiveSession {
  id: string;
  type: 'group' | 'individual';
  group_id?: string;
  student_id?: string;
  student_ids?: string[];
  session_date: string;
  session_time: string;
  session_number?: number;
  total_sessions?: number;
  status: string;
  students_count?: number;
  completed_count?: number;
  course_name?: string;
  teacher_notes?: string;
}

interface GroupDetailsDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface RpcResponse {
  success: boolean;
  message: string;
}

const GroupDetailsDialog = ({ group, open, onOpenChange, onSuccess }: GroupDetailsDialogProps) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  // Helper function to check if a student should be included in a session based on their start date
  const isStudentEligibleForSession = (studentStartDate: string | undefined, sessionDate: string | undefined): boolean => {
    if (!studentStartDate || !sessionDate) return true; // If no dates, assume eligible

    try {
      const startDate = new Date(studentStartDate);
      const sessDate = new Date(sessionDate);

      // Student is eligible if their start date is on or before the session date
      return startDate <= sessDate;
    } catch (error) {
      console.error('Error comparing dates:', error);
      return true; // Default to eligible if date parsing fails
    }
  };

  // Helper function to get eligible students for a specific session date
  const getEligibleStudents = (students: GroupStudent[], sessionDate: string | undefined): GroupStudent[] => {
    if (!sessionDate || !students) return students;

    return students.filter(student => isStudentEligibleForSession(student.start_date, sessionDate));
  };

  // Fetch group students from Firebase
  const { data: groupStudents, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['group-students', group?.id],
    queryFn: async () => {
      if (!group?.id) return [];

      console.log('Fetching students for group:', group.id);

      try {
        // Get the group students from Firebase subcollection
        const groupStudentsData = await databaseService.query(`groups/${group.id}/students`, {});
        
        console.log('Group students data:', groupStudentsData);

        if (!groupStudentsData || groupStudentsData.length === 0) {
          console.log('No active students found for group');
          return [];
        }

        // Get student details
        const enrichedStudents = await Promise.all(
          groupStudentsData.map(async (gs: any) => {
            const studentData = await databaseService.getById('students', gs.studentId);
            const userData = studentData ? await databaseService.getById('users', studentData.user_id || studentData.userId) : null;
            
            const result = {
              id: gs.id,
              student_id: gs.studentId,
              student_name: userData?.name || gs.studentName || 'Unknown Student',
              student_email: userData?.email || '',
              status: gs.status || 'active',
              start_date: gs.startDate || gs.start_date
            };
            console.log('Enriched student data:', result);
            return result;
          })
        );

        return enrichedStudents as GroupStudent[];
      } catch (error) {
        console.error('Error fetching group students:', error);
        return [];
      }
    },
    enabled: !!group?.id && open
  });

  // Fetch subscription data for all students in the group
  const { data: studentSubscriptions } = useQuery({
    queryKey: ['group-student-subscriptions', group?.id, groupStudents],
    queryFn: async () => {
      if (!group?.id || !groupStudents || groupStudents.length === 0) return {};

      console.log('Fetching subscriptions for group students:', groupStudents);

      const subscriptionMap: { [studentId: string]: any } = {};

      await Promise.all(
        groupStudents.map(async (student) => {
          try {
            // Query subscriptions for this student in this group
            const subscriptions = await databaseService.query('subscriptions', {
              where: [
                { field: 'student_id', operator: '==', value: student.student_id },
                { field: 'group_id', operator: '==', value: group.id }
              ]
            });

            if (subscriptions && subscriptions.length > 0) {
              const subscription = subscriptions[0]; // Get first matching subscription

              // Count completed sessions (attended + cancelled)
              const allSessions = await databaseService.query('sessions', {
                where: [
                  { field: 'subscription_id', operator: '==', value: subscription.id }
                ]
              });

              const completedSessions = allSessions.filter(
                (s: any) => s.status === 'attended' || s.status === 'cancelled'
              ).length;

              subscriptionMap[student.student_id] = {
                ...subscription,
                completedSessions,
                sessionCount: subscription.session_count || subscription.sessionCount || 0,
                totalPrice: subscription.total_price || subscription.totalPrice || 0,
                currency: subscription.currency || 'USD',
                startDate: subscription.start_date || subscription.startDate,
                endDate: subscription.end_date || subscription.endDate
              };

              console.log(`Subscription data for ${student.student_name}:`, subscriptionMap[student.student_id]);
            }
          } catch (error) {
            console.error(`Error fetching subscription for student ${student.student_id}:`, error);
          }
        })
      );

      return subscriptionMap;
    },
    enabled: !!group?.id && !!groupStudents && groupStudents.length > 0 && open
  });

  // Fetch active sessions for all students in the group
  const { data: activeSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['group-active-sessions', group?.id, groupStudents],
    queryFn: async () => {
      if (!group?.id || !groupStudents || groupStudents.length === 0) return [];

      console.log('Fetching active sessions for group students:', groupStudents);

      try {
        // Get all student IDs from the group
        const studentIds = groupStudents.map(gs => gs.student_id);
        console.log('Student IDs to query sessions for:', studentIds);
        const allSessions: ActiveSession[] = [];

        // Check Firebase FIRST (primary source for group sessions created by CreateGroupDialog)
        try {
          console.log('Checking Firebase for sessions for group:', group.id);
          
          // First, try to get group sessions
          const { data: groupSessionsData, error: groupSessionsError } = await supabase
            .from('sessions')
            .select('*')
            .eq('group_id', group.id);

          console.log('Group sessions query result:', { groupSessionsData, groupSessionsError });

          // Also try individual student sessions
          const { data: studentSessionsData, error: studentSessionsError } = await supabase
            .from('sessions')
            .select('*')
            .in('student_id', studentIds);

          console.log('Student sessions query result:', { studentSessionsData, studentSessionsError });

          // Combine both results
          const sessionsData = [...(groupSessionsData || []), ...(studentSessionsData || [])];
          const sessionsError = groupSessionsError || studentSessionsError;

          console.log('Combined Supabase sessions:', sessionsData);

          if (!sessionsError && sessionsData && sessionsData.length > 0) {
            console.log('Found sessions in Supabase:', sessionsData.length);

            // Filter for active sessions (scheduled or in_progress) and current/future dates
            const filteredSessions = sessionsData.filter(session => {
              // Be more flexible with status - could be 'scheduled', 'upcoming', 'pending', etc.
              const isActive = !session.status ||
                               session.status === 'scheduled' ||
                               session.status === 'upcoming' ||
                               session.status === 'pending' ||
                               session.status === 'in_progress';

              // Check various date fields (check scheduled_date FIRST since that's what CreateGroupDialog uses)
              const sessionDate = session.scheduled_date || session.session_date || session.date;
              const isFuture = !sessionDate || new Date(sessionDate) >= new Date(new Date().toISOString().split('T')[0]);

              // NEW: For individual student sessions, check if session date is after student's start date
              let isAfterStudentStart = true;
              if (session.student_id && !session.group_id) {
                const student = groupStudents?.find(gs => gs.student_id === session.student_id);
                if (student && student.start_date && sessionDate) {
                  isAfterStudentStart = isStudentEligibleForSession(student.start_date, sessionDate);
                }
              }

              console.log('Session filter check:', {
                id: session.id,
                status: session.status,
                group_id: session.group_id,
                student_id: session.student_id,
                date: sessionDate,
                isActive,
                isFuture,
                isAfterStudentStart
              });
              return isActive && isFuture && isAfterStudentStart;
            });

            console.log('Filtered Supabase sessions:', filteredSessions);
            
            // Format the Supabase sessions data
            // Group sessions by date and type to avoid duplicates
            const sessionMap = new Map();
            
            for (const session of filteredSessions) {
              // Check for student_id first (per-student model)
              if (session.student_id) {
                // Individual student session
                const key = `individual-${session.student_id}-${session.scheduled_date || session.session_date || session.date}`;

                if (!sessionMap.has(key)) {
                  const student = groupStudents.find(gs => gs.student_id === session.student_id);
                  
                  const formattedSession = {
                    id: session.id,
                    type: 'individual' as const,
                    student_id: session.student_id,
                    session_date: session.scheduled_date || session.session_date || session.date,
                    session_time: session.scheduled_time || session.session_time || session.time || session.start_time,
                    status: session.status || 'scheduled',
                    course_name: session.course_name || student?.student_name || 'Individual Session',
                    teacher_notes: session.teacher_notes || session.notes
                  };
                  
                  console.log('Formatted individual session:', formattedSession);
                  sessionMap.set(key, formattedSession);
                }
              }
            }
            
            // Add unique sessions to the array
            allSessions.push(...sessionMap.values());
          }
        } catch (error) {
          console.log('Supabase sessions query failed:', error);
        }
        
        // Also check Firebase for sessions - try multiple approaches
        try {
          console.log('Checking Firebase for sessions for group:', group.id);
          
          // Try different field names for group ID
          let firebaseGroupSessions = await databaseService.query('sessions', {
            where: [
              { field: 'groupId', operator: '==', value: group.id }
            ]
          });
          
          // If no results, try with group_id
          if (!firebaseGroupSessions || firebaseGroupSessions.length === 0) {
            firebaseGroupSessions = await databaseService.query('sessions', {
              where: [
                { field: 'group_id', operator: '==', value: group.id }
              ]
            });
          }
          
          // Also try fetching from group's sessions subcollection
          if (!firebaseGroupSessions || firebaseGroupSessions.length === 0) {
            try {
              firebaseGroupSessions = await databaseService.query(`groups/${group.id}/sessions`, {});
              console.log('Found sessions in group subcollection:', firebaseGroupSessions);
            } catch (e) {
              console.log('No sessions subcollection for group');
            }
          }
          
          console.log('Firebase group sessions:', firebaseGroupSessions);
          
          if (firebaseGroupSessions && firebaseGroupSessions.length > 0) {
            console.log('Processing Firebase group sessions:', firebaseGroupSessions);
            
            for (const session of firebaseGroupSessions) {
              console.log('Individual session data:', {
                session,
                time: session.time,
                sessionTime: session.sessionTime,
                session_time: session.session_time,
                start_time: session.start_time,
                startTime: session.startTime,
                allFields: Object.keys(session)
              });
              // Extract date from various possible fields
              let sessionDate = session.date || session.sessionDate || session.session_date || session.scheduled_date;
              
              // If date is in Firebase Timestamp format
              if (sessionDate && typeof sessionDate === 'object' && sessionDate.seconds) {
                sessionDate = new Date(sessionDate.seconds * 1000).toISOString().split('T')[0];
              }
              
              // Skip sessions without valid dates for now
              if (!sessionDate) {
                console.warn('Session missing date:', session);
                continue;
              }
              
              // Try multiple field names for time
              let sessionTime = session.time || session.sessionTime || session.session_time || session.start_time || session.startTime;
              
              // Check if there's a students array with individual times
              if (!sessionTime && session.students && Array.isArray(session.students)) {
                // Get time from first student session
                const firstStudent = session.students[0];
                if (firstStudent) {
                  sessionTime = firstStudent.time || firstStudent.sessionTime || firstStudent.start_time;
                }
              }
              
              // If time is an object with hours/minutes
              if (sessionTime && typeof sessionTime === 'object') {
                if (sessionTime.hours !== undefined && sessionTime.minutes !== undefined) {
                  sessionTime = `${String(sessionTime.hours).padStart(2, '0')}:${String(sessionTime.minutes).padStart(2, '0')}`;
                }
              }
              
              // Check if session has studentSessions with actual times
              if (!sessionTime && session.studentSessions) {
                const studentSessionsArray = Object.values(session.studentSessions);
                if (studentSessionsArray.length > 0) {
                  const firstStudentSession = studentSessionsArray[0] as any;
                  sessionTime = firstStudentSession.time || firstStudentSession.sessionTime;
                }
              }
              
              // Default to schedule time if no time found
              if (!sessionTime && group.schedule && group.schedule[0]) {
                sessionTime = group.schedule[0].time || '16:00';
              }
              
              // Handle "03:00" format (might be coming as just "03" or "3")
              if (sessionTime && !sessionTime.includes(':')) {
                sessionTime = `${sessionTime.padStart(2, '0')}:00`;
              }
              
              sessionTime = sessionTime || '16:00';
              const sessionId = session.id || `firebase-group-${group.id}-${sessionDate}`;

              if (!allSessions.find(s => s.id === sessionId)) {
                // Read the actual student_id from the Firebase session (per-student model)
                const studentId = session.student_id || session.studentId;

                if (studentId) {
                  const formattedSession = {
                    id: sessionId,
                    type: 'individual' as const,
                    group_id: group.id,
                    student_id: studentId,
                    session_date: sessionDate,
                    session_time: sessionTime,
                    session_number: session.sessionNumber || session.session_number || session.index || session.index_in_sub,
                    total_sessions: session.totalSessions || group.session_count,
                    status: session.status || 'scheduled',
                    course_name: session.courseName || group.name,
                    teacher_notes: session.teacherNotes || session.notes
                  };

                  console.log('Adding Firebase session for student:', studentId, 'on', sessionDate, 'at', sessionTime);
                  allSessions.push(formattedSession);
                } else {
                  console.warn('Session missing student_id:', session);
                }
              }
            }
          }
          
          // Also check for individual student sessions
          for (const student of groupStudents) {
            const firebaseSessions = await databaseService.query('sessions', {
              where: [
                { field: 'studentId', operator: '==', value: student.student_id }
              ]
            });
            
            if (firebaseSessions && firebaseSessions.length > 0) {
              console.log('Firebase sessions for student:', student.student_id, firebaseSessions);

              // Format Firebase individual sessions and filter by start date
              const formattedFirebaseSessions = firebaseSessions
                .filter((session: any) => {
                  const sessionDate = session.date || session.sessionDate || session.session_date || session.scheduled_date;
                  // Only include sessions on or after the student's start date
                  return isStudentEligibleForSession(student.start_date, sessionDate);
                })
                .map((session: any) => ({
                  id: session.id,
                  type: 'individual' as const,
                  student_id: student.student_id,
                  session_date: session.date || session.sessionDate,
                  session_time: session.time || session.sessionTime,
                  status: session.status || 'scheduled',
                  course_name: session.courseName || student.student_name,
                  teacher_notes: session.teacherNotes || session.notes
                }));

              // Add only sessions that aren't already in the list (avoid duplicates)
              formattedFirebaseSessions.forEach(session => {
                if (!allSessions.find(s => s.id === session.id)) {
                  allSessions.push(session);
                }
              });
            }
          }
        } catch (error) {
          console.log('Firebase sessions query failed:', error);
        }

        // If no sessions found but group has sessions planned, generate them from schedule
        if (allSessions.length === 0 && group.session_count > 0) {
          console.log('No sessions found, generating from group schedule:', group.schedule);
          
          // Generate sessions based on group schedule
          const today = new Date();
          const schedule = Array.isArray(group.schedule) ? group.schedule : [];
          
          for (let i = 0; i < group.session_count; i++) {
            // Calculate session date based on schedule
            let sessionDate = new Date(today);
            
            // Parse schedule days and times
            let scheduleTime = '16:00'; // default
            let scheduleDays = ['Thursday', 'Friday']; // from group schedule
            
            if (schedule && schedule.length > 0) {
              // Get time from schedule - could be different for different days
              const scheduleItem = schedule[i % schedule.length];
              scheduleTime = scheduleItem?.time || schedule[0]?.time || '16:00';
              // Get days from schedule
              scheduleDays = schedule.map(s => s.day);
              
              console.log('Using schedule time:', scheduleTime, 'from schedule:', schedule);
            }
            
            // Calculate proper date based on schedule day
            const dayIndex = i % scheduleDays.length;
            const weekOffset = Math.floor(i / scheduleDays.length);
            sessionDate.setDate(today.getDate() + (weekOffset * 7) + dayIndex);

            const sessionDateString = sessionDate.toISOString().split('T')[0];

            // Get only eligible students for this session date
            const eligibleStudents = getEligibleStudents(groupStudents, sessionDateString);

            const generatedSession = {
              id: `generated-${group.id}-session-${i + 1}`,
              type: 'group' as const,
              group_id: group.id,
              student_ids: eligibleStudents.map(s => s.student_id),
              session_date: sessionDateString,
              session_time: scheduleTime,
              session_number: i + 1,
              total_sessions: group.session_count,
              status: 'scheduled',
              students_count: eligibleStudents.length,
              completed_count: 0,
              course_name: group.name,
              teacher_notes: null
            };

            console.log('Generated session:', generatedSession, 'Eligible students:', eligibleStudents.length, '/', groupStudents.length);
            allSessions.push(generatedSession);
          }
        }
        
        // Sort all sessions by date and time
        allSessions.sort((a, b) => {
          const dateA = new Date(a.session_date || '2099-12-31');
          const dateB = new Date(b.session_date || '2099-12-31');
          const dateCompare = dateA.getTime() - dateB.getTime();
          if (dateCompare !== 0) return dateCompare;
          return (a.session_time || '').localeCompare(b.session_time || '');
        });

        console.log('All active sessions:', allSessions);
        return allSessions;
      } catch (error) {
        console.error('Error fetching active sessions:', error);
        return [];
      }
    },
    enabled: !!group?.id && !!groupStudents && groupStudents.length > 0 && open
  });

  // Group sessions by date and time to avoid showing duplicates
  const groupedSessions = useMemo(() => {
    if (!activeSessions || activeSessions.length === 0) return [];

    // Create a map to group sessions by date_time key
    const sessionMap = new Map<string, {
      date: string;
      time: string;
      studentSessions: ActiveSession[];
      studentCount: number;
    }>();

    for (const session of activeSessions) {
      const dateKey = `${session.session_date}_${session.session_time}`;

      if (!sessionMap.has(dateKey)) {
        sessionMap.set(dateKey, {
          date: session.session_date,
          time: session.session_time,
          studentSessions: [],
          studentCount: 0
        });
      }

      const group = sessionMap.get(dateKey)!;
      group.studentSessions.push(session);

      // Count unique students
      const uniqueStudents = new Set(
        group.studentSessions.map(s => s.student_id).filter(Boolean)
      );
      group.studentCount = uniqueStudents.size;
    }

    // Convert map to array and sort by date/time
    return Array.from(sessionMap.values()).sort((a, b) => {
      const dateA = new Date(a.date || '2099-12-31');
      const dateB = new Date(b.date || '2099-12-31');
      const dateCompare = dateA.getTime() - dateB.getTime();
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [activeSessions]);

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!user?.schoolId || !group) {
      toast({
        title: "Error",
        description: "Unable to remove student. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setRemovingStudentId(studentId);
    
    try {
      // Find and remove the student from the group in Firebase
      const groupStudents = await databaseService.query(`groups/${group.id}/students`, {
        where: [{ field: 'studentId', operator: '==', value: studentId }]
      });
      
      if (groupStudents && groupStudents.length > 0) {
        // Remove the student from the group
        await databaseService.delete(`groups/${group.id}/students`, groupStudents[0].id);
      } else {
        throw new Error('Student not found in group');
      }

      toast({
        title: "Success!",
        description: `${studentName} has been removed from the group.`,
      });

      // Refresh the students list and group data
      refetchStudents();
      onSuccess?.();
      
    } catch (error) {
      console.error('Error removing student from group:', error);
      
      toast({
        title: "Error Removing Student",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemovingStudentId(null);
    }
  };

  const handleAddStudentSuccess = () => {
    refetchStudents();
    onSuccess?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const formatPrice = (group: Group) => {
    // Check if group has multi-currency pricing
    if (group.prices_by_currency && Object.keys(group.prices_by_currency).length > 0) {
      const pricesArray = Object.entries(group.prices_by_currency)
        .filter(([_, priceData]) => {
          const price = group.price_mode === 'perSession' ? priceData.per_session : priceData.total;
          return price && parseFloat(String(price)) > 0;
        })
        .map(([code, priceData]) => {
          const price = group.price_mode === 'perSession' ? priceData.per_session : priceData.total;
          const symbol = priceData.symbol || code;
          if (group.price_mode === 'perSession') {
            return `${price} ${symbol}/session`;
          } else {
            return `${price} ${symbol} total`;
          }
        });

      return pricesArray.length > 0 ? pricesArray.join(' • ') : 'No price set';
    }

    // Fallback to old single-currency format
    if (group.price_mode === 'perSession') {
      return `${group.price_per_session} ${group.currency}/session`;
    } else {
      return `${group.total_price} ${group.currency} total`;
    }
  };

  const formatSchedule = (schedule: any) => {
    if (!schedule || !Array.isArray(schedule)) return 'No schedule';
    
    return schedule.map((item: any) => 
      `${item.day} ${item.time}`
    ).join(', ');
  };

  if (!group) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              {group.name}
              <Badge className={getStatusColor(group.status)}>
                {group.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Group Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Group Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-foreground">{group.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Teacher</p>
                      <p className="text-sm text-foreground">{group.teacher_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Sessions</p>
                      <p className="text-sm text-foreground">{group.session_count} sessions</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Schedule</p>
                      <p className="text-sm text-foreground">{formatSchedule(group.schedule)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Price</p>
                      <p className="text-sm text-foreground">{formatPrice(group)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Active Sessions ({groupedSessions?.length || 0} unique dates)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-20 bg-muted rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : !groupedSessions || groupedSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No Active Sessions</h3>
                      <p className="text-muted-foreground">
                        There are no scheduled sessions for students in this group.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedSessions.map((sessionGroup, index) => {
                        // Use the first session from the group for display
                        const representativeSession = sessionGroup.studentSessions[0];
                        const sessionKey = `${sessionGroup.date}_${sessionGroup.time}`;
                        const isExpanded = expandedSessions.has(sessionKey);
                        // Fix time parsing - handle various formats
                        let displayTime = '16:00';
                        let displayHour = '16';
                        let displayMinute = '00';

                        // Try to get time from session data
                        const sessionTimeStr = sessionGroup.time || representativeSession.session_time || '16:00';
                        
                        if (sessionTimeStr) {
                          const timeStr = sessionTimeStr.toString();
                          console.log('Parsing time string:', timeStr, 'from sessionKey:', sessionKey);
                          
                          // Check if it's just a number like "03" or "3"
                          if (!isNaN(parseInt(timeStr)) && !timeStr.includes(':')) {
                            const hour = parseInt(timeStr);
                            displayHour = hour.toString().padStart(2, '0');
                            displayMinute = '00';
                            displayTime = `${displayHour}:${displayMinute}`;
                          } else if (timeStr.includes(':')) {
                            const [h, m] = timeStr.split(':');
                            displayHour = h.padStart(2, '0');
                            displayMinute = (m || '00').padStart(2, '0');
                            displayTime = `${displayHour}:${displayMinute}`;
                          } else if (timeStr.length === 4) {
                            // Handle time as HHMM format
                            displayHour = timeStr.substring(0, 2);
                            displayMinute = timeStr.substring(2, 4);
                            displayTime = `${displayHour}:${displayMinute}`;
                          } else {
                            // Try to parse from group schedule
                            if (group.schedule && group.schedule[0] && group.schedule[0].time) {
                              const scheduleTime = group.schedule[0].time;
                              if (scheduleTime.includes(':')) {
                                const [h, m] = scheduleTime.split(':');
                                displayHour = h.padStart(2, '0');
                                displayMinute = (m || '00').padStart(2, '0');
                                displayTime = `${displayHour}:${displayMinute}`;
                              }
                            }
                          }
                        }

                        // Always render as a grouped session card
                        return (
                          // Group Session Card - Dark theme adapted
                          <div key={sessionKey} className="bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
                            {/* Header */}
                            <div className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                  {/* Time Display */}
                                  <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{displayHour}</div>
                                    <div className="text-xl text-blue-600 dark:text-blue-400">:{displayMinute}</div>
                                    <div className="text-sm text-muted-foreground">60 min</div>
                                  </div>

                                  {/* Session Info */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="h-10 w-10 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center">
                                        <Users className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-foreground">Group Session</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge className="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 text-xs border-blue-200 dark:border-blue-800">
                                            <Users className="h-3 w-3 mr-1" />
                                            {sessionGroup.studentCount} {sessionGroup.studentCount === 1 ? 'student' : 'students'}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                      <Calendar className="h-4 w-4" />
                                      <span>
                                        {sessionGroup.date && sessionGroup.date !== 'Invalid Date'
                                          ? new Date(sessionGroup.date).toLocaleDateString('en-US', {
                                              weekday: 'long',
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric'
                                            })
                                          : 'Date TBD'
                                        }
                                      </span>
                                    </div>

                                    {/* Scheduled Badge */}
                                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                      {sessionGroup.studentCount} scheduled
                                    </Badge>
                                  </div>
                                </div>

                                {/* Toggle Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSessionExpanded(sessionKey)}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-1" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-1" />
                                      Show Details
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* Expandable Details */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                                  {/* Individual Student Sessions */}
                                  <div className="mb-4">
                                    <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      Individual Student Sessions
                                    </h4>
                                    <div className="space-y-3">
                                      {sessionGroup.studentSessions.map((studentSession, studentIndex) => {
                                        // Find the student info from groupStudents
                                        const student = groupStudents?.find(gs => gs.student_id === studentSession.student_id);
                                        if (!student) return null;

                                        const subscriptionInfo = studentSubscriptions?.[student.student_id];
                                        return (
                                          <div key={`${studentSession.id}-${student.student_id}`} className="bg-white dark:bg-gray-900/50 rounded-lg border border-blue-100 dark:border-blue-900 p-4">
                                          <div className="flex items-start justify-between">
                                            <div className="flex gap-4 flex-1">
                                              {/* Time */}
                                              <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{displayHour}</div>
                                                <div className="text-lg text-blue-600 dark:text-blue-400">:{displayMinute}</div>
                                                <div className="text-xs text-muted-foreground">60 min</div>
                                              </div>

                                              {/* Student Info */}
                                              <div className="flex-1">
                                                <h5 className="font-semibold text-foreground">{student.student_name}</h5>
                                                <p className="text-sm text-muted-foreground">Nails - a1 Lesson</p>
                                                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                                  <Calendar className="h-3 w-3" />
                                                  <span>
                                                    {sessionGroup.date && sessionGroup.date !== 'Invalid Date'
                                                      ? new Date(sessionGroup.date).toLocaleDateString('en-US', {
                                                          weekday: 'long',
                                                          month: 'long',
                                                          day: 'numeric'
                                                        })
                                                      : 'Date TBD'
                                                    }
                                                  </span>
                                                </div>

                                                {/* Session Details Bar */}
                                                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/50 rounded-md flex items-center gap-4 text-xs text-muted-foreground">
                                                  <span className="flex items-center gap-1">
                                                    <Hash className="h-3 w-3" />
                                                    Session {studentSession.session_number || representativeSession.session_number || index + 1}
                                                  </span>
                                                  <span>{subscriptionInfo?.sessionCount || group.session_count} lessons total</span>
                                                  {subscriptionInfo && (
                                                    <>
                                                      <span className="flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3" />
                                                        {subscriptionInfo.totalPrice} {subscriptionInfo.currency}
                                                      </span>
                                                      <span>
                                                        {subscriptionInfo.startDate && new Date(subscriptionInfo.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                        {subscriptionInfo.endDate && ` - ${new Date(subscriptionInfo.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`}
                                                      </span>
                                                    </>
                                                  )}
                                                </div>

                                                {/* View Details */}
                                                <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-2 text-sm">
                                                  <ExternalLink className="h-3 w-3 mr-1" />
                                                  View Session Details
                                                </Button>
                                              </div>
                                            </div>

                                            {/* Progress */}
                                            <div className="text-right">
                                              <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-3 border border-blue-100 dark:border-blue-900">
                                                <div className="text-blue-600 dark:text-blue-400 text-xs mb-1">Progress</div>
                                                {subscriptionInfo ? (
                                                  <>
                                                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                                      {subscriptionInfo.completedSessions}/{subscriptionInfo.sessionCount}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Sessions completed</div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                      {Math.round((subscriptionInfo.completedSessions / subscriptionInfo.sessionCount) * 100)}% done
                                                    </div>
                                                  </>
                                                ) : (
                                                  <>
                                                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">0/{group.session_count}</div>
                                                    <div className="text-xs text-muted-foreground">Sessions completed</div>
                                                    <div className="text-xs text-muted-foreground mt-1">0% done</div>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Action Buttons */}
                                          <div className="flex gap-2 mt-4">
                                            <Button 
                                              size="sm"
                                              variant="outline" 
                                              className="text-green-600 border-green-600 hover:bg-green-50"
                                            >
                                              <Check className="h-3 w-3 mr-1" />
                                              Mark as Attended
                                            </Button>
                                            <Button 
                                              size="sm"
                                              variant="outline" 
                                              className="text-red-600 border-red-600 hover:bg-red-50"
                                            >
                                              <X className="h-3 w-3 mr-1" />
                                              Cancel Session
                                            </Button>
                                            <Button 
                                              size="sm"
                                              variant="outline" 
                                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                            >
                                              <RefreshCw className="h-3 w-3 mr-1" />
                                              Reschedule
                                            </Button>
                                            <Button 
                                              size="sm"
                                              variant="outline" 
                                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                            >
                                              <MoveRight className="h-3 w-3 mr-1" />
                                              Move
                                            </Button>
                                          </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Students ({groupStudents?.length || 0})
                    </CardTitle>
                    <Button
                      onClick={() => setShowAddStudent(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Student to Group
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {studentsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-muted rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : !groupStudents || groupStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No Students Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        This group doesn't have any active students yet. Add students to get started.
                      </p>
                      <Button
                        onClick={() => setShowAddStudent(true)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add First Student
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupStudents.map((student) => (
                        <div key={student.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-foreground">{student.student_name}</h4>
                              <p className="text-sm text-muted-foreground">{student.student_email}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <Badge className={getStatusColor(student.status)}>
                                  {student.status}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Joined: {new Date(student.start_date).toLocaleDateString()}
                                </p>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={removingStudentId === student.student_id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Student from Group</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove {student.student_name} from this group?
                                      This will mark their subscription as inactive and cancel all future scheduled sessions.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRemoveStudent(student.student_id, student.student_name)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Remove Student
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-6 mt-4">
              <GroupSubscriptionsTab groupId={group.id} groupStudents={groupStudents || []} />
            </TabsContent>

            <TabsContent value="payments" className="space-y-6 mt-4">
              <GroupPaymentsTab groupId={group.id} groupStudents={groupStudents || []} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <AddStudentToGroupDialog
        open={showAddStudent}
        onOpenChange={setShowAddStudent}
        group={group}
        onSuccess={handleAddStudentSuccess}
      />
    </>
  );
};

export default GroupDetailsDialog;

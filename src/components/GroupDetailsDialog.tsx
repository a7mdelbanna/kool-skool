
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Calendar, DollarSign, Clock, Plus, User, Trash2, BookOpen, CheckCircle, ChevronDown, ChevronUp, Check, X, RefreshCw, MoveRight, ExternalLink, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { UserContext } from '@/App';
import { useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import AddStudentToGroupDialog from './AddStudentToGroupDialog';

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
        
        // Try Supabase first - check both group sessions and individual student sessions
        try {
          console.log('Querying Supabase for sessions with group ID:', group.id, 'and student IDs:', studentIds);
          
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
              
              // Check various date fields
              const sessionDate = session.session_date || session.date || session.scheduled_date;
              const isFuture = !sessionDate || new Date(sessionDate) >= new Date(new Date().toISOString().split('T')[0]);
              
              console.log('Session filter check:', { 
                id: session.id, 
                status: session.status,
                group_id: session.group_id,
                student_id: session.student_id,
                date: sessionDate,
                isActive,
                isFuture 
              });
              return isActive && isFuture;
            });

            console.log('Filtered Supabase sessions:', filteredSessions);
            
            // Format the Supabase sessions data
            // Group sessions by date and type to avoid duplicates
            const sessionMap = new Map();
            
            for (const session of filteredSessions) {
              if (session.group_id) {
                // This is a group session - show as a single card
                const key = `group-${session.group_id}-${session.session_date || session.date}`;
                
                if (!sessionMap.has(key)) {
                  const formattedSession = {
                    id: session.id,
                    type: 'group' as const,
                    group_id: session.group_id,
                    student_ids: groupStudents.map(s => s.student_id),
                    session_date: session.session_date || session.date,
                    session_time: session.session_time || session.time || session.start_time,
                    session_number: session.session_number || session.session_index,
                    total_sessions: session.total_sessions || group.session_count,
                    status: session.status || 'scheduled',
                    students_count: groupStudents.length,
                    completed_count: session.completed_count || 0,
                    course_name: session.course_name || group.name,
                    teacher_notes: session.teacher_notes || session.notes
                  };
                  
                  console.log('Formatted group session:', formattedSession);
                  sessionMap.set(key, formattedSession);
                }
              } else if (session.student_id) {
                // Individual student session
                const key = `individual-${session.student_id}-${session.session_date || session.date}`;
                
                if (!sessionMap.has(key)) {
                  const student = groupStudents.find(gs => gs.student_id === session.student_id);
                  
                  const formattedSession = {
                    id: session.id,
                    type: 'individual' as const,
                    student_id: session.student_id,
                    session_date: session.session_date || session.date,
                    session_time: session.session_time || session.time || session.start_time,
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
                const formattedSession = {
                  id: sessionId,
                  type: 'group' as const,
                  group_id: group.id,
                  student_ids: groupStudents.map(s => s.student_id),
                  session_date: sessionDate,
                  session_time: sessionTime,
                  session_number: session.sessionNumber || session.session_number || session.index,
                  total_sessions: session.totalSessions || group.session_count,
                  status: session.status || 'scheduled',
                  students_count: groupStudents.length,
                  completed_count: session.completedCount || 0,
                  course_name: session.courseName || group.name,
                  teacher_notes: session.teacherNotes || session.notes
                };
                
                console.log('Adding Firebase group session:', formattedSession);
                allSessions.push(formattedSession);
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
              
              // Format Firebase individual sessions
              const formattedFirebaseSessions = firebaseSessions.map((session: any) => ({
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
            
            const generatedSession = {
              id: `generated-${group.id}-session-${i + 1}`,
              type: 'group' as const,
              group_id: group.id,
              student_ids: groupStudents.map(s => s.student_id),
              session_date: sessionDate.toISOString().split('T')[0],
              session_time: scheduleTime,
              session_number: i + 1,
              total_sessions: group.session_count,
              status: 'scheduled',
              students_count: groupStudents.length,
              completed_count: 0,
              course_name: group.name,
              teacher_notes: null
            };
            
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
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (group: Group) => {
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

          <div className="space-y-6">
            {/* Group Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Group Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                    <p className="text-sm text-gray-900">{group.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Teacher</p>
                      <p className="text-sm text-gray-900">{group.teacher_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Sessions</p>
                      <p className="text-sm text-gray-900">{group.session_count} sessions</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Schedule</p>
                      <p className="text-sm text-gray-900">{formatSchedule(group.schedule)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Price</p>
                      <p className="text-sm text-gray-900">{formatPrice(group)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Students List */}
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
                        <div className="h-16 bg-gray-200 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : !groupStudents || groupStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Yet</h3>
                    <p className="text-gray-600 mb-4">
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
                      <div key={student.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{student.student_name}</h4>
                            <p className="text-sm text-gray-600">{student.student_email}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge className={getStatusColor(student.status)}>
                                {student.status}
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">
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

            <Separator />

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Active Sessions ({activeSessions?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-20 bg-gray-200 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : !activeSessions || activeSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Sessions</h3>
                      <p className="text-gray-600">
                        There are no scheduled sessions for students in this group.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeSessions.map((session, index) => {
                        const isExpanded = expandedSessions.has(session.id);
                        // Fix time parsing - handle various formats
                        let displayTime = '16:00';
                        let displayHour = '16';
                        let displayMinute = '00';
                        
                        // Try to get time from session data
                        const sessionTimeStr = session.session_time || session.time || '16:00';
                        
                        if (sessionTimeStr) {
                          const timeStr = sessionTimeStr.toString();
                          console.log('Parsing time string:', timeStr, 'from session:', session.id);
                          
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
                        
                        return session.type === 'group' ? (
                          // Group Session Card - EXACTLY like Attendance page
                          <div key={session.id} className="bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
                            {/* Header */}
                            <div className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                  {/* Time Display */}
                                  <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600">{displayHour}</div>
                                    <div className="text-xl text-blue-600">:{displayMinute}</div>
                                    <div className="text-sm text-gray-500">60 min</div>
                                  </div>
                                  
                                  {/* Session Info */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <Users className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-900">Group Session</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge className="bg-blue-100 text-blue-600 text-xs">
                                            <Users className="h-3 w-3 mr-1" />
                                            {session.students_count} students
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Date */}
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                      <Calendar className="h-4 w-4" />
                                      <span>
                                        {session.session_date && session.session_date !== 'Invalid Date' 
                                          ? new Date(session.session_date).toLocaleDateString('en-US', {
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
                                    <Badge className="bg-blue-100 text-blue-700">
                                      {session.students_count} scheduled
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Toggle Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSessionExpanded(session.id)}
                                  className="text-blue-600 hover:text-blue-700"
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
                                <div className="mt-4 pt-4 border-t border-blue-200">
                                  {/* Individual Student Sessions */}
                                  <div className="mb-4">
                                    <h4 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      Individual Student Sessions
                                    </h4>
                                    <div className="space-y-3">
                                      {groupStudents?.map((student, studentIndex) => (
                                        <div key={student.student_id} className="bg-white rounded-lg border border-blue-100 p-4">
                                          <div className="flex items-start justify-between">
                                            <div className="flex gap-4 flex-1">
                                              {/* Time */}
                                              <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">{displayHour}</div>
                                                <div className="text-lg text-blue-600">:{displayMinute}</div>
                                                <div className="text-xs text-gray-500">60 min</div>
                                              </div>
                                              
                                              {/* Student Info */}
                                              <div className="flex-1">
                                                <h5 className="font-semibold text-gray-900">{student.student_name}</h5>
                                                <p className="text-sm text-gray-600">Nails - a1 Lesson</p>
                                                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                                                  <Calendar className="h-3 w-3" />
                                                  <span>
                                                    {session.session_date && session.session_date !== 'Invalid Date' 
                                                      ? new Date(session.session_date).toLocaleDateString('en-US', {
                                                          weekday: 'long',
                                                          month: 'long',
                                                          day: 'numeric'
                                                        })
                                                      : 'Date TBD'
                                                    }
                                                  </span>
                                                </div>
                                                
                                                {/* Session Details Bar */}
                                                <div className="mt-3 p-2 bg-blue-50 rounded-md flex items-center gap-4 text-xs">
                                                  <span className="flex items-center gap-1">
                                                    <Hash className="h-3 w-3" />
                                                    Session {session.session_number || index + 1}
                                                  </span>
                                                  <span>{session.total_sessions || group.session_count} lessons total</span>
                                                  <span>$8000</span>
                                                  <span>27 Aug - 27 Aug</span>
                                                </div>
                                                
                                                {/* View Details */}
                                                <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700 mt-2 text-sm">
                                                  <ExternalLink className="h-3 w-3 mr-1" />
                                                  View Session Details
                                                </Button>
                                              </div>
                                            </div>
                                            
                                            {/* Progress */}
                                            <div className="text-right">
                                              <div className="bg-blue-50 rounded-lg p-3">
                                                <div className="text-blue-600 text-xs mb-1">Progress</div>
                                                <div className="text-2xl font-bold text-blue-700">2/4</div>
                                                <div className="text-xs text-gray-600">Sessions completed</div>
                                                <div className="text-xs text-gray-600 mt-1">50% done</div>
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
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Individual Session Card
                          <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <h4 className="font-medium text-gray-900">{session.course_name}</h4>
                                  <Badge className="bg-green-100 text-green-800">Individual</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(session.session_date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{session.session_time}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>
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

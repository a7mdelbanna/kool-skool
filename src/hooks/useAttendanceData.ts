
import { useState, useCallback, useMemo } from 'react';
import { Session } from '@/contexts/PaymentContext';
import { getStudentLessonSessions, getStudentsWithDetails, getStudentSubscriptions, LessonSession } from '@/integrations/supabase/client';
import { getEffectiveTimezone, convertUTCToUserTimezone, formatInUserTimezone } from '@/utils/timezone';

interface StudentInfo {
  id: string;
  courseName?: string;
  level?: string;
  firstName: string;
  lastName: string;
}

interface SubscriptionInfo {
  id: string;
  studentId: string;
  sessionCount: number;
  completedSessions: number;
  attendedSessions: number;
  cancelledSessions: number;
  scheduledSessions: number;
  totalPrice: number;
  currency: string;
  startDate: string;
  endDate: string;
  subscriptionName?: string;
}

export const useAttendanceData = (userTimezone?: string) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subscriptionInfoMap, setSubscriptionInfoMap] = useState<Map<string, SubscriptionInfo>>(new Map());
  const [studentInfoMap, setStudentInfoMap] = useState<Map<string, StudentInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveTimezone = useMemo(() => getEffectiveTimezone(userTimezone), [userTimezone]);

  // Optimistic update function for session status
  const updateSessionOptimistically = useCallback((sessionId: string, newStatus: Session['status']) => {
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId 
          ? { ...session, status: newStatus }
          : session
      )
    );

    // Update subscription info if the status change affects completion counts
    if (newStatus === 'completed') {
      setSessions(prevSessions => {
        const updatedSession = prevSessions.find(s => s.id === sessionId);
        if (updatedSession) {
          setSubscriptionInfoMap(prevMap => {
            const newMap = new Map(prevMap);
            const subscriptionInfo = newMap.get(updatedSession.studentId);
            if (subscriptionInfo) {
              newMap.set(updatedSession.studentId, {
                ...subscriptionInfo,
                completedSessions: subscriptionInfo.completedSessions + 1,
                attendedSessions: subscriptionInfo.attendedSessions + 1
              });
            }
            return newMap;
          });
        }
        return prevSessions;
      });
    }
  }, []);

  // Revert optimistic update (in case of error)
  const revertSessionUpdate = useCallback((sessionId: string, originalStatus: Session['status']) => {
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId 
          ? { ...session, status: originalStatus }
          : session
      )
    );
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user || !user.schoolId) {
        console.warn('No user or school ID found');
        setSessions([]);
        return;
      }

      console.log('🚀 Loading attendance data for school:', user.schoolId);
      
      // Step 1: Get all students (this is fast)
      const students = await getStudentsWithDetails(user.schoolId);
      console.log('👥 Found students:', students.length);
      
      if (students.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Step 2: Build student info map immediately
      const studentMap = new Map<string, StudentInfo>();
      students.forEach(student => {
        studentMap.set(student.id, {
          id: student.id,
          courseName: student.course_name,
          level: student.level,
          firstName: student.first_name,
          lastName: student.last_name
        });
      });
      setStudentInfoMap(studentMap);

      // Step 3: Fetch sessions and subscriptions in parallel for all students
      const studentIds = students.map(s => s.id);
      
      console.log('🔄 Fetching sessions and subscriptions in parallel...');
      
      const [sessionsResults, subscriptionsResults] = await Promise.all([
        // Fetch all sessions in parallel
        Promise.allSettled(
          studentIds.map(async (studentId) => {
            const sessions = await getStudentLessonSessions(studentId);
            return { studentId, sessions };
          })
        ),
        // Fetch all subscriptions in parallel
        Promise.allSettled(
          studentIds.map(async (studentId) => {
            const subscriptions = await getStudentSubscriptions(studentId);
            return { studentId, subscriptions };
          })
        )
      ]);

      // Process sessions
      const allSessions: Session[] = [];
      sessionsResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { studentId, sessions } = result.value;
          const student = studentMap.get(studentId);
          
          if (student) {
            const convertedSessions: Session[] = sessions.map((session: LessonSession) => {
              // Use scheduled_datetime if available, otherwise combine date and time
              let sessionDateTime: Date;
              
              if (session.scheduled_datetime) {
                // Use the full datetime if available (already in correct timezone)
                sessionDateTime = new Date(session.scheduled_datetime);
              } else if (session.scheduled_time) {
                // Combine date and time in Cairo timezone
                const dateStr = session.scheduled_date;
                const timeStr = session.scheduled_time;
                
                // Parse the date as local Cairo time
                const [year, month, day] = dateStr.split('-').map(Number);
                const [hours, minutes] = timeStr.split(':').map(Number);
                
                // Create date in local timezone (which should be Cairo)
                sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
              } else {
                // Fallback to just the date
                const utcDate = new Date(session.scheduled_date);
                sessionDateTime = convertUTCToUserTimezone(utcDate, effectiveTimezone);
              }
              
              const localDate = convertUTCToUserTimezone(sessionDateTime, effectiveTimezone);
              
              return {
                id: session.id,
                studentId: studentId,
                studentName: `${student.firstName} ${student.lastName}`,
                date: localDate,
                time: formatInUserTimezone(sessionDateTime, effectiveTimezone, 'HH:mm'),
                duration: `${session.duration_minutes || 60} min`,
                status: session.status as Session['status'],
                sessionNumber: session.index_in_sub || undefined,
                totalSessions: undefined,
                notes: session.notes || '',
                cost: session.cost,
                paymentStatus: session.payment_status as Session['paymentStatus']
              };
            });
            
            allSessions.push(...convertedSessions);
          }
        } else {
          console.error(`Failed to load sessions for student ${studentIds[index]}:`, result.reason);
        }
      });

      // Process subscriptions
      const subscriptionMap = new Map<string, SubscriptionInfo>();
      subscriptionsResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { studentId, subscriptions } = result.value;
          const activeSubscription = subscriptions.find(sub => sub.status === 'active');
          
          if (activeSubscription) {
            // Get session counts from subscription or calculate from sessions
            const attendedSessions = (activeSubscription as any).sessions_attended ?? 0;
            const cancelledSessions = (activeSubscription as any).sessions_cancelled ?? 0;
            
            // For progress tracking, both completed AND cancelled sessions count as "done"
            // This matches the behavior in student subscriptions where cancelled sessions count toward progress
            const completedSessionsFromDB = (activeSubscription as any).sessions_completed ?? 0;
            const completedSessions = attendedSessions + cancelledSessions; // Use the sum for progress
            
            const scheduledSessions = (activeSubscription as any).sessions_scheduled ?? 0;
            
            // Calculate the end date based on duration_months (subscriptions don't have end_date field)
            let endDate: string;
            if (activeSubscription.start_date && activeSubscription.duration_months) {
              const startDate = new Date(activeSubscription.start_date);
              const calculatedEndDate = new Date(startDate);
              calculatedEndDate.setMonth(calculatedEndDate.getMonth() + activeSubscription.duration_months);
              endDate = calculatedEndDate.toISOString().split('T')[0];
              console.log(`Calculated end date from duration_months (${activeSubscription.duration_months} months) for student ${studentId}: start=${activeSubscription.start_date}, end=${endDate}`);
            } else if (activeSubscription.start_date && activeSubscription.session_count) {
              // If no duration_months, estimate based on session count
              const startDate = new Date(activeSubscription.start_date);
              // Estimate end date: assume 2 sessions per week
              const weeksNeeded = Math.ceil(activeSubscription.session_count / 2);
              const calculatedEndDate = new Date(startDate);
              calculatedEndDate.setDate(calculatedEndDate.getDate() + (weeksNeeded * 7));
              endDate = calculatedEndDate.toISOString().split('T')[0];
              console.log(`Estimated end date from session count for student ${studentId}: ${endDate}`);
            } else {
              // Fallback to start date if we can't calculate
              endDate = activeSubscription.start_date;
              console.warn(`Could not calculate end date for student ${studentId}, using start date as fallback`);
            }

            const subscriptionInfo: SubscriptionInfo = {
              id: activeSubscription.id,
              studentId: studentId,
              sessionCount: activeSubscription.session_count,
              completedSessions: completedSessions, // Now includes cancelled sessions
              attendedSessions: attendedSessions,
              cancelledSessions: cancelledSessions,
              scheduledSessions: scheduledSessions,
              totalPrice: activeSubscription.total_price,
              currency: activeSubscription.currency,
              startDate: activeSubscription.start_date,
              endDate: endDate, // Now properly calculated above
              subscriptionName: activeSubscription.notes || undefined
            };

            subscriptionMap.set(studentId, subscriptionInfo);
          }
        } else {
          console.error(`Failed to load subscriptions for student ${studentIds[index]}:`, result.reason);
        }
      });

      console.log('✅ Loaded:', allSessions.length, 'sessions and', subscriptionMap.size, 'subscriptions');
      
      setSessions(allSessions);
      setSubscriptionInfoMap(subscriptionMap);
      
    } catch (error) {
      console.error('❌ Error loading attendance data:', error);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [effectiveTimezone]);

  const refreshSessions = useCallback(() => {
    return loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    subscriptionInfoMap,
    studentInfoMap,
    loading,
    error,
    loadSessions,
    refreshSessions,
    updateSessionOptimistically,
    revertSessionUpdate
  };
};

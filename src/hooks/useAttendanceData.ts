
import { useState, useCallback, useMemo } from 'react';
import { Session } from '@/contexts/PaymentContext';
import { getStudentLessonSessions, getStudentsWithDetails, getStudentSubscriptions, LessonSession, getSchoolTeachers } from '@/integrations/supabase/client';
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
  teacherId?: string;
  groupId?: string;
  groupName?: string;
}

interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

export const useAttendanceData = (userTimezone?: string) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subscriptionInfoMap, setSubscriptionInfoMap] = useState<Map<string, SubscriptionInfo>>(new Map());
  const [studentInfoMap, setStudentInfoMap] = useState<Map<string, StudentInfo>>(new Map());
  const [teacherInfoMap, setTeacherInfoMap] = useState<Map<string, TeacherInfo>>(new Map());
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

      // Step 1: Get all students, teachers, and groups (all are fast)
      const [students, teachers, groupsData] = await Promise.all([
        getStudentsWithDetails(user.schoolId),
        getSchoolTeachers(user.schoolId),
        // Fetch groups from Firebase directly
        (async () => {
          try {
            const { databaseService } = await import('@/services/firebase/database.service');
            return await databaseService.query('groups', {
              where: [{ field: 'schoolId', operator: '==', value: user.schoolId }]
            });
          } catch (error) {
            console.error('Error fetching groups:', error);
            return [];
          }
        })()
      ]);
      console.log('👥 Found students:', students.length);
      console.log('👨‍🏫 Found teachers:', teachers.length);
      console.log('👥 Found groups:', groupsData.length);

      if (students.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Step 2: Build student, teacher, and group info maps immediately
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

      const teacherMap = new Map<string, TeacherInfo>();
      teachers.forEach(teacher => {
        teacherMap.set(teacher.id, {
          id: teacher.id,
          firstName: teacher.first_name || teacher.firstName,
          lastName: teacher.last_name || teacher.lastName,
          displayName: teacher.display_name || `${teacher.first_name || teacher.firstName} ${teacher.last_name || teacher.lastName}`
        });
      });
      setTeacherInfoMap(teacherMap);

      // Step 2.5: Build subscription-to-group map from groups data
      // Groups contain subscription_ids array, so we map each subscription to its group
      const subscriptionToGroupMap = new Map<string, { groupId: string; groupName: string }>();
      console.log('🔍 DEBUG: Processing groups for subscription mapping...');
      groupsData.forEach((group: any) => {
        const groupId = group.id;
        const groupName = group.name || group.group_name || 'Group Session';
        const subscriptionIds = group.subscription_ids || group.subscriptionIds || [];

        console.log(`🔍 DEBUG: Group "${groupName}" (${groupId}):`, {
          subscription_ids: group.subscription_ids,
          subscriptionIds: group.subscriptionIds,
          count: subscriptionIds.length,
          allFields: Object.keys(group)
        });

        subscriptionIds.forEach((subId: string) => {
          subscriptionToGroupMap.set(subId, { groupId, groupName });
          console.log(`  ✅ Mapped subscription ${subId} → "${groupName}"`);
        });
      });
      console.log('🔗 Mapped', subscriptionToGroupMap.size, 'subscriptions to groups');
      if (subscriptionToGroupMap.size > 0) {
        console.log('📋 Subscription→Group map entries:', Array.from(subscriptionToGroupMap.entries()).slice(0, 3));
      }

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
                paymentStatus: session.payment_status as Session['paymentStatus'],
                // Include group info directly from session if available
                groupId: session.groupId || session.group_id || undefined,
                groupName: session.groupName || session.group_name || undefined
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

            // Check if this subscription is part of a group using our map
            const groupInfo = subscriptionToGroupMap.get(activeSubscription.id);
            console.log(`🔍 Subscription ${activeSubscription.id} for student ${studentId}:`, {
              foundInGroupMap: !!groupInfo,
              groupInfo: groupInfo,
              subscriptionFields: {
                groupId: activeSubscription.groupId,
                group_id: activeSubscription.group_id,
                groupName: activeSubscription.groupName,
                group_name: activeSubscription.group_name
              }
            });

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
              subscriptionName: activeSubscription.notes || undefined,
              teacherId: activeSubscription.teacherId || activeSubscription.teacher_id,
              // Use group info from map first, fallback to subscription fields
              groupId: groupInfo?.groupId || activeSubscription.groupId || activeSubscription.group_id,
              groupName: groupInfo?.groupName || activeSubscription.groupName || activeSubscription.group_name
            };

            subscriptionMap.set(studentId, subscriptionInfo);
          }
        } else {
          console.error(`Failed to load subscriptions for student ${studentIds[index]}:`, result.reason);
        }
      });

      // Step 4: Enrich sessions with teacher information from subscriptions
      console.log('🔍 DEBUG: Starting teacher enrichment');
      console.log('🔍 DEBUG: Total sessions to enrich:', allSessions.length);
      console.log('🔍 DEBUG: Subscription map size:', subscriptionMap.size);
      console.log('🔍 DEBUG: Teacher map size:', teacherMap.size);
      console.log('🔍 DEBUG: Sample subscription:', Array.from(subscriptionMap.values())[0]);

      const enrichedSessions = allSessions.map(session => {
        const subscriptionInfo = subscriptionMap.get(session.studentId);

        if (!subscriptionInfo) {
          console.log('⚠️ No subscription found for student:', session.studentId, 'Student name:', session.studentName);
        } else if (!subscriptionInfo.teacherId) {
          console.log('⚠️ Subscription has no teacherId for student:', session.studentId, 'Subscription:', subscriptionInfo);
        } else {
          const teacher = teacherMap.get(subscriptionInfo.teacherId);
          if (!teacher) {
            console.log('⚠️ Teacher not found in map for ID:', subscriptionInfo.teacherId);
          } else {
            console.log('✅ Enriched session for student:', session.studentName, 'with teacher:', teacher.displayName);
          }
        }

        if (subscriptionInfo) {
          const teacher = subscriptionInfo.teacherId ? teacherMap.get(subscriptionInfo.teacherId) : undefined;
          return {
            ...session,
            teacherId: subscriptionInfo.teacherId,
            teacherName: teacher?.displayName || undefined,
            // Preserve session's own group info if it exists, otherwise use subscription's group info
            groupId: session.groupId || subscriptionInfo.groupId,
            groupName: session.groupName || subscriptionInfo.groupName
          };
        }
        return session;
      });

      console.log('✅ Loaded:', enrichedSessions.length, 'sessions and', subscriptionMap.size, 'subscriptions');
      console.log('📊 Sessions with teachers:', enrichedSessions.filter(s => s.teacherId).length);
      console.log('📊 Sessions with groupId:', enrichedSessions.filter(s => s.groupId).length);
      console.log('📊 Sample enriched session:', enrichedSessions.find(s => s.teacherId));
      console.log('📊 Sample session with group:', enrichedSessions.find(s => s.groupId));

      setSessions(enrichedSessions);
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
    teacherInfoMap,
    loading,
    error,
    loadSessions,
    refreshSessions,
    updateSessionOptimistically,
    revertSessionUpdate
  };
};

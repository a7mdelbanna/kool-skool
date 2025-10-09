import { useQuery } from '@tanstack/react-query';
import { databaseService } from '@/services/firebase/database.service';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addDays } from 'date-fns';

interface ExpiredSubscription {
  id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  profileImage?: string;
  start_date: string;
  end_date: string;
  calculated_end_date?: string;
  session_count: number;
  sessions_completed: number;
  status: 'expired' | 'expiring';
  teacher_name?: string;
  teacher_id?: string;
  courseName?: string;
  daysUntilExpiry: number;
  totalPrice?: number;
  currency?: string;
  subscription_number?: number;
}

export const useExpiredSubscriptions = (schoolId?: string) => {
  return useQuery({
    queryKey: ['expired-subscriptions', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      console.log('🔄 Fetching subscriptions for renewal...');

      try {
        // Get all active students from Firebase
        const students = await databaseService.query('students', {
          where: [
            { field: 'schoolId', operator: '==', value: schoolId },
            { field: 'status', operator: '==', value: 'active' }
          ]
        });

        if (!students || students.length === 0) {
          return [];
        }

        const subscriptionsToRenew: ExpiredSubscription[] = [];

        // Define date range: expired subscriptions and those expiring in next 7 days
        const today = new Date();
        const sevenDaysFromNow = addDays(today, 7);

        // Process each student
        for (const student of students) {
          try {
            // Get subscriptions for this student from Supabase
            let studentSubscriptions: any[] = [];

            try {
              const { data: supabaseSubscriptions, error } = await supabase
                .rpc('get_student_subscriptions', {
                  p_student_id: student.id
                });

              if (!error && supabaseSubscriptions && supabaseSubscriptions.length > 0) {
                studentSubscriptions = supabaseSubscriptions;
                console.log(`Found ${studentSubscriptions.length} subscriptions from Supabase for student ${student.firstName}`);
              }
            } catch (error) {
              console.log('Error fetching from Supabase, trying Firebase');
            }

            // If no subscriptions from Supabase, try Firebase as fallback
            if (studentSubscriptions.length === 0) {
              let subscriptions = await databaseService.query('subscriptions', {
                where: [{ field: 'student_id', operator: '==', value: student.id }]
              });

              if (subscriptions.length === 0) {
                subscriptions = await databaseService.query('subscriptions', {
                  where: [{ field: 'studentId', operator: '==', value: student.id }]
                });
              }

              studentSubscriptions = subscriptions;
            }

            if (studentSubscriptions.length === 0) continue;

            // Sort subscriptions by start_date to assign sequential numbers
            studentSubscriptions.sort((a: any, b: any) => {
              const dateA = new Date(a.start_date || a.created_at || 0);
              const dateB = new Date(b.start_date || b.created_at || 0);
              return dateA.getTime() - dateB.getTime(); // Oldest first for numbering
            });

            // Process each subscription with numbering
            for (let i = 0; i < studentSubscriptions.length; i++) {
              const subscription = studentSubscriptions[i];
              const subscriptionNumber = i + 1;

              // Calculate actual end date based on last session
              let calculatedEndDate = subscription.end_date || subscription.endDate;

              try {
                // Query sessions for this subscription from Firebase
                let sessions = await databaseService.query('sessions', {
                  where: [{ field: 'subscriptionId', operator: '==', value: subscription.id }]
                });

                if (sessions.length === 0) {
                  sessions = await databaseService.query('sessions', {
                    where: [{ field: 'subscription_id', operator: '==', value: subscription.id }]
                  });
                }

                // Also try to get sessions from Supabase
                if (sessions.length === 0) {
                  const { data: supabaseSessions } = await supabase
                    .from('lesson_sessions')
                    .select('*')
                    .eq('subscription_id', subscription.id)
                    .order('scheduled_date', { ascending: false });

                  if (supabaseSessions && supabaseSessions.length > 0) {
                    sessions = supabaseSessions;
                  }
                }

                if (sessions.length > 0) {
                  // Sort sessions by scheduled_date to find the last one
                  const sortedSessions = sessions.sort((a: any, b: any) => {
                    const dateA = new Date(a.scheduled_date || a.scheduledDate || a.date);
                    const dateB = new Date(b.scheduled_date || b.scheduledDate || b.date);
                    return dateB.getTime() - dateA.getTime(); // Descending order
                  });

                  // Get the last session's date
                  const lastSession = sortedSessions[0];
                  if (lastSession && (lastSession.scheduled_date || lastSession.scheduledDate)) {
                    calculatedEndDate = lastSession.scheduled_date || lastSession.scheduledDate;
                    console.log(`📅 Found last session date for subscription ${subscription.id}:`, calculatedEndDate);
                  }
                }
              } catch (error) {
                console.error(`Error fetching sessions for subscription ${subscription.id}:`, error);
              }

              const actualEndDate = new Date(calculatedEndDate);

              if (isNaN(actualEndDate.getTime())) continue;

              // Check if this is the latest subscription for the student
              const isLatestSubscription = i === studentSubscriptions.length - 1;

              // Only consider the latest subscription for renewal
              if (!isLatestSubscription) continue;

              // Check if expired or expiring soon
              const isExpired = actualEndDate < today;
              const isExpiringSoon = actualEndDate >= today && actualEndDate <= sevenDaysFromNow;

              if (isExpired || isExpiringSoon) {
                // Get teacher name if available
                let teacherName = 'No Teacher Assigned';
                if (subscription.teacher_id || subscription.teacherId) {
                  try {
                    const teacher = await databaseService.getById('teachers', subscription.teacher_id || subscription.teacherId);
                    teacherName = teacher?.name || 'No Teacher Assigned';
                  } catch (error) {
                    console.log('Could not fetch teacher');
                  }
                }

                // Count completed sessions for this subscription
                let completedSessions = 0;
                try {
                  const sessions = await databaseService.query('sessions', {
                    where: [
                      { field: 'subscriptionId', operator: '==', value: subscription.id }
                    ]
                  });

                  let allSessions = sessions || [];
                  if (allSessions.length === 0) {
                    const sessionsSnakeCase = await databaseService.query('sessions', {
                      where: [{ field: 'subscription_id', operator: '==', value: subscription.id }]
                    });
                    allSessions = sessionsSnakeCase || [];
                  }

                  completedSessions = allSessions.filter((s: any) =>
                    s.status === 'completed' || s.status === 'attended'
                  ).length;
                } catch (error) {
                  console.log('Could not fetch sessions');
                }

                const daysUntilExpiry = differenceInDays(actualEndDate, today);

                subscriptionsToRenew.push({
                  id: subscription.id,
                  student_id: student.id,
                  student_name: `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim(),
                  student_email: student.email,
                  profileImage: student.image || student.profileImage,
                  start_date: subscription.start_date || subscription.startDate,
                  end_date: subscription.end_date || subscription.endDate,
                  calculated_end_date: calculatedEndDate,
                  session_count: subscription.session_count || subscription.sessionCount || 0,
                  sessions_completed: completedSessions,
                  status: isExpired ? 'expired' : 'expiring',
                  teacher_name: teacherName,
                  teacher_id: subscription.teacher_id || subscription.teacherId,
                  courseName: student.courseName || student.course_name,
                  daysUntilExpiry: daysUntilExpiry,
                  totalPrice: subscription.totalPrice || subscription.total_price || subscription.price,
                  currency: subscription.currency || 'USD',
                  subscription_number: subscriptionNumber
                });

                console.log(`📊 Found subscription #${subscriptionNumber} needing renewal for ${student.firstName}:`, {
                  subscriptionId: subscription.id,
                  originalEndDate: subscription.end_date,
                  calculatedEndDate: calculatedEndDate,
                  isExpired,
                  daysUntilExpiry
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching subscriptions for student ${student.id}:`, error);
          }
        }

        // Sort by urgency (expired first, then by days until expiry)
        subscriptionsToRenew.sort((a, b) => {
          if (a.status === 'expired' && b.status !== 'expired') return -1;
          if (a.status !== 'expired' && b.status === 'expired') return 1;
          return a.daysUntilExpiry - b.daysUntilExpiry;
        });

        console.log(`📊 Found ${subscriptionsToRenew.length} subscriptions needing renewal`);
        return subscriptionsToRenew;
      } catch (error) {
        console.error('Error fetching expired subscriptions:', error);
        throw error;
      }
    },
    enabled: !!schoolId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
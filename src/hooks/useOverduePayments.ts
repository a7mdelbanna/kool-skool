import { useQuery } from '@tanstack/react-query';
import { databaseService } from '@/services/firebase/database.service';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

export interface OverduePayment {
  subscriptionId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  profileImage?: string;
  courseName?: string;

  // Payment details
  totalPrice: number;
  totalPaid: number;
  amountOwed: number;
  paymentPercentage: number;
  currency: string;

  // Subscription details
  subscriptionStatus: 'active' | 'paused' | 'completed' | 'cancelled';
  startDate: string;
  daysSinceStart: number;
  sessionCount: number;
  sessionsCompleted: number;

  // Priority
  priority: 'urgent' | 'high' | 'normal';
}

export const useOverduePayments = (schoolId?: string) => {
  return useQuery({
    queryKey: ['overdue-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      console.log('💰 Fetching overdue payments...');

      try {
        // Get all students from Firebase
        const students = await databaseService.query('students', {
          where: [{ field: 'schoolId', operator: '==', value: schoolId }]
        });

        if (!students || students.length === 0) {
          return [];
        }

        const overduePayments: OverduePayment[] = [];
        const today = new Date();

        // Process each student
        for (const student of students) {
          try {
            // Get subscriptions for this student from Supabase RPC
            let studentSubscriptions: any[] = [];

            try {
              const { data: supabaseSubscriptions, error } = await supabase
                .rpc('get_student_subscriptions', {
                  p_student_id: student.id
                });

              if (!error && supabaseSubscriptions && supabaseSubscriptions.length > 0) {
                studentSubscriptions = supabaseSubscriptions;
              }
            } catch (error) {
              console.error('Error fetching from Supabase:', error);
            }

            if (studentSubscriptions.length === 0) continue;

            const studentName = `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim();
            const studentEmail = student.email;
            const studentPhone = student.phone || student.phoneNumber;
            const profileImage = student.image || student.profileImage;
            const courseName = student.courseName || student.course_name;

            // Process each subscription
            for (const subscription of studentSubscriptions) {
              try {
                // Calculate total paid from Firebase payments
                let totalPaid = 0;

                // Get payments linked to this student from Firebase
                try {
                  const payments = await databaseService.query('payments', {
                    where: [
                      { field: 'student_id', operator: '==', value: student.id },
                      { field: 'type', operator: '==', value: 'income' }
                    ]
                  });

                  const studentPaymentTotal = (payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
                  totalPaid = studentPaymentTotal;
                } catch (error) {
                  console.error('Error fetching student payments:', error);
                }

                // Get transaction payments for this subscription
                try {
                  const transactions = await databaseService.query('transactions', {
                    where: [
                      { field: 'subscription_id', operator: '==', value: subscription.id },
                      { field: 'type', operator: '==', value: 'income' }
                    ]
                  });

                  const transactionPaymentTotal = (transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0);

                  // Use the higher of the two totals to avoid underestimating payments
                  totalPaid = Math.max(totalPaid, transactionPaymentTotal);
                } catch (error) {
                  console.error('Error fetching transaction payments:', error);
                }

                const totalPrice = subscription.total_price || subscription.totalPrice || subscription.price || 0;
                const amountOwed = Math.max(totalPrice - totalPaid, 0);

                // Only include subscriptions with outstanding balance
                if (amountOwed <= 0) continue;

                const paymentPercentage = totalPrice > 0 ? (totalPaid / totalPrice) * 100 : 0;
                const startDate = subscription.start_date || subscription.startDate;
                const daysSinceStart = startDate ? differenceInDays(today, new Date(startDate)) : 0;
                const subscriptionStatus = subscription.status || 'active';

                // Determine priority
                let priority: 'urgent' | 'high' | 'normal' = 'normal';

                if (subscriptionStatus === 'active') {
                  if (totalPaid === 0) {
                    // Zero payment on active subscription = URGENT
                    priority = 'urgent';
                  } else if (daysSinceStart > 30) {
                    // Partial payment but >30 days old = HIGH
                    priority = 'high';
                  }
                }

                overduePayments.push({
                  subscriptionId: subscription.id,
                  studentId: student.id,
                  studentName,
                  studentEmail,
                  studentPhone,
                  profileImage,
                  courseName,

                  // Payment details
                  totalPrice,
                  totalPaid,
                  amountOwed,
                  paymentPercentage,
                  currency: subscription.currency || 'EGP',

                  // Subscription details
                  subscriptionStatus,
                  startDate: startDate || '',
                  daysSinceStart,
                  sessionCount: subscription.session_count || subscription.sessionCount || 0,
                  sessionsCompleted: subscription.sessions_completed || 0,

                  // Priority
                  priority
                });

                console.log(`💸 Found overdue payment for ${studentName}:`, {
                  subscriptionId: subscription.id,
                  amountOwed,
                  priority
                });
              } catch (error) {
                console.error(`Error processing subscription ${subscription.id}:`, error);
              }
            }
          } catch (error) {
            console.error(`Error processing student ${student.id}:`, error);
          }
        }

        // Sort by priority and amount owed
        overduePayments.sort((a, b) => {
          // Priority order: urgent > high > normal
          const priorityOrder = { urgent: 0, high: 1, normal: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];

          if (priorityDiff !== 0) return priorityDiff;

          // Within same priority, sort by amount owed (highest first)
          return b.amountOwed - a.amountOwed;
        });

        console.log(`💰 Found ${overduePayments.length} subscriptions with overdue payments`);
        console.log(`   - Urgent: ${overduePayments.filter(p => p.priority === 'urgent').length}`);
        console.log(`   - High: ${overduePayments.filter(p => p.priority === 'high').length}`);
        console.log(`   - Normal: ${overduePayments.filter(p => p.priority === 'normal').length}`);

        return overduePayments;
      } catch (error) {
        console.error('Error fetching overdue payments:', error);
        throw error;
      }
    },
    enabled: !!schoolId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

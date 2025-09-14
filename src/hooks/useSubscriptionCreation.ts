
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { sessionGeneratorService } from '@/services/firebase/sessionGenerator.service';
import { toast } from 'sonner';
import { toZonedTime } from 'date-fns-tz';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface SubscriptionFormData {
  sessionCount: number;
  durationMonths: number;
  sessionDuration?: number; // Add session duration field
  startDate: Date;
  schedule: any[];
  priceMode: 'perSession' | 'fixedPrice';
  pricePerSession?: number;
  fixedPrice?: number;
  totalPrice: number;
  currency: string;
  notes?: string;
  status: string;
  initialPayment: {
    amount: number;
    method: string;
    notes: string;
    accountId: string;
  };
}

export const useSubscriptionCreation = (studentId: string, onSuccess?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Get user's timezone (Cairo)
  const getUserTimezone = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.timezone || 'Africa/Cairo';
      }
    } catch {
      return 'Africa/Cairo';
    }
    return 'Africa/Cairo';
  };

  const userTimezone = getUserTimezone();

  // Get school ID from localStorage with better error handling
  const getSchoolId = () => {
    try {
      const userData = localStorage.getItem('user');
      console.log('📋 Raw user data from localStorage:', userData);
      
      if (!userData) {
        console.error('❌ No user data found in localStorage');
        return null;
      }
      
      const user = JSON.parse(userData);
      console.log('📋 Parsed user data:', user);
      
      // Try different possible property names for school ID
      const schoolId = user.schoolId || user.school_id || user.schoolId;
      console.log('🏫 Extracted school ID:', schoolId);
      
      return schoolId;
    } catch (error) {
      console.error('❌ Error parsing user data from localStorage:', error);
      return null;
    }
  };

  const getCurrentUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        console.error('❌ No user data found in localStorage for user ID');
        return null;
      }
      
      const user = JSON.parse(userData);
      console.log('📋 User data for user ID extraction:', user);
      
      // Try different possible property names for user ID
      const userId = user.user_id || user.id || user.userId;
      console.log('👤 Extracted user ID:', userId);
      
      return userId;
    } catch (error) {
      console.error('❌ Error parsing user data for user ID:', error);
      return null;
    }
  };

  const createSubscriptionMutation = useMutation({
    mutationFn: async (formData: SubscriptionFormData) => {
      const schoolId = getSchoolId();
      const currentUserId = getCurrentUserId();
      
      console.log('🔍 Debug info:');
      console.log('  - School ID:', schoolId);
      console.log('  - User ID:', currentUserId);
      console.log('  - Student ID:', studentId);
      
      if (!schoolId) {
        console.error('❌ School ID not found in user data');
        throw new Error('School ID not found. Please log in again.');
      }
      
      if (!currentUserId) {
        console.error('❌ User ID not found in user data');
        throw new Error('User ID not found. Please log in again.');
      }

      console.log('🎯 Creating subscription with data:', formData);

      // Validate that price is set
      if (!formData.totalPrice || formData.totalPrice <= 0) {
        console.error('❌ Subscription price validation failed:', formData.totalPrice);
        throw new Error('Subscription price must be greater than zero. Please enter a valid price.');
      }

      // Validate that account currency matches subscription currency
      if (formData.initialPayment.accountId && formData.initialPayment.amount > 0) {
        // Use RPC function to get accounts with proper currency info
        const { data: allAccounts, error: accountError } = await supabase.rpc('get_school_accounts', {
          p_school_id: schoolId
        });

        if (accountError) throw accountError;

        // Find the specific account
        const accountData = allAccounts?.find((acc: any) => acc.id === formData.initialPayment.accountId);
        
        if (!accountData) {
          throw new Error('Selected account not found');
        }

        const accountCurrency = accountData.currency_code;
        if (accountCurrency !== formData.currency) {
          throw new Error(`Account currency (${accountCurrency}) must match subscription currency (${formData.currency})`);
        }
      }

      // Create subscription using the existing RPC function
      const { data: subscriptionData, error: subscriptionError } = await supabase.rpc(
        'add_student_subscription',
        {
          p_student_id: studentId,
          p_session_count: formData.sessionCount,
          p_duration_months: formData.durationMonths,
          p_session_duration_minutes: formData.sessionDuration || 60, // Include session duration
          p_start_date: (() => {
            // Format date as YYYY-MM-DD in user timezone
            const date = formData.startDate;
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          })(),
          p_schedule: formData.schedule,
          p_price_mode: formData.priceMode,
          p_price_per_session: formData.pricePerSession || null,
          p_fixed_price: formData.fixedPrice || null,
          p_total_price: formData.totalPrice,
          p_currency: formData.currency,
          p_notes: formData.notes || '',
          p_status: formData.status,
          p_current_user_id: currentUserId,
          p_current_school_id: schoolId,
          p_initial_payment_amount: 0, // We'll handle payment separately
          p_payment_method: 'Cash',
          p_payment_notes: ''
        }
      );

      if (subscriptionError) {
        console.error('❌ Subscription creation error:', subscriptionError);
        throw subscriptionError;
      }

      const subscriptionId = subscriptionData[0]?.id;
      if (!subscriptionId) {
        throw new Error('Failed to get subscription ID');
      }

      console.log('✅ Subscription created with ID:', subscriptionId);

      // Generate sessions for the subscription
      try {
        console.log('📅 Generating sessions for subscription...');
        console.log('  Subscription ID:', subscriptionId);
        console.log('  Student ID:', studentId);
        console.log('  Session count:', formData.sessionCount);
        console.log('  Start date:', formData.startDate);
        
        // Get student details to find teacher and course info
        const student = await databaseService.getById('students', studentId);
        if (!student) {
          console.error('❌ Student not found for session generation');
          throw new Error('Student not found');
        }
        
        const teacherId = student.teacherId || student.teacher_id || '';
        const courseId = student.courseId || student.course_id || '';
        
        console.log('  Teacher ID:', teacherId);
        console.log('  Course ID:', courseId);
        console.log('  School ID:', schoolId);
        
        // Generate sessions based on subscription details
        // Parse the schedule to extract time and days
        let sessionHour = 10; // Default to 10 AM
        let sessionMinute = 0;
        
        // If schedule has time information, use it
        if (formData.schedule && formData.schedule.length > 0 && formData.schedule[0].time) {
          const timeStr = formData.schedule[0].time;
          // Parse time string (e.g., "8:00" or "08:00")
          const timeParts = timeStr.split(':');
          if (timeParts.length === 2) {
            sessionHour = parseInt(timeParts[0]) || 10;
            sessionMinute = parseInt(timeParts[1]) || 0;
          }
        }
        
        const startDate = new Date(formData.startDate);
        startDate.setHours(sessionHour, sessionMinute, 0, 0); // Set to scheduled time
        
        console.log('Creating sessions with time:', sessionHour + ':' + sessionMinute);
        
        const sessionIds = await sessionGeneratorService.generateWeeklySessions(
          subscriptionId,
          studentId,
          teacherId,
          schoolId,
          courseId,
          formData.sessionCount,
          startDate,
          formData.schedule?.length || 2 // Default to 2 sessions per week
        );
        
        console.log(`✅ Generated ${sessionIds.length} sessions for subscription`);
        console.log('  Session IDs:', sessionIds);
        
        if (sessionIds.length === 0) {
          console.warn('⚠️ No sessions were generated!');
          toast.warning('Warning: No sessions were generated for this subscription');
        } else {
          toast.success(`Created ${sessionIds.length} sessions for the subscription`);
        }
      } catch (sessionError: any) {
        console.error('❌ Error generating sessions:', sessionError);
        console.error('  Error message:', sessionError.message);
        console.error('  Error stack:', sessionError.stack);
        // Don't fail the whole subscription if session generation fails
        toast.warning('Subscription created but sessions could not be generated. Please create them manually.');
      }

      // If there's an initial payment, create it as a transaction
      if (formData.initialPayment.amount > 0 && formData.initialPayment.accountId) {
        console.log('💰 Creating initial payment transaction...');
        
        // Get student's income category if available
        let categoryId = null;
        try {
          const student = await databaseService.getById('students', studentId);
          if (student) {
            categoryId = student.income_category_id || student.incomeCategoryId || null;
            console.log('📂 Student income category ID:', categoryId);
          }
        } catch (error) {
          console.warn('Could not fetch student income category:', error);
        }
        
        const { data: transactionId, error: transactionError } = await supabase.rpc('create_transaction', {
          p_school_id: schoolId,
          p_type: 'income',
          p_amount: formData.initialPayment.amount,
          p_currency: formData.currency,
          p_transaction_date: (() => {
            // Format date as YYYY-MM-DD in user timezone
            const date = formData.startDate;
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          })(),
          p_description: `Initial payment for subscription`,
          p_notes: formData.initialPayment.notes || 'Initial subscription payment',
          p_to_account_id: formData.initialPayment.accountId,
          p_payment_method: formData.initialPayment.method,
          p_tag_ids: null,
          p_category_id: categoryId, // Include the student's income category
          p_subscription_id: subscriptionId, // Link to subscription directly
          p_student_id: studentId // Also link to student for easier tracking
        });

        if (transactionError) {
          console.error('❌ Transaction creation error:', transactionError);
          throw transactionError;
        }

        console.log('✅ Initial payment transaction created and linked:', transactionId);
      }

      return subscriptionData;
    },
    onSuccess: (data) => {
      console.log('✅ Subscription creation successful:', data);
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['student-subscriptions', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-payments', studentId] });
      queryClient.invalidateQueries({ queryKey: ['school-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['school-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['students-with-details'] });
      
      toast.success('Subscription created successfully!');
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('❌ Subscription creation failed:', error);
      toast.error(error.message || 'Failed to create subscription');
    },
  });

  const createSubscription = async (formData: SubscriptionFormData) => {
    setIsSubmitting(true);
    try {
      await createSubscriptionMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent rapid calls function
  const preventRapidCalls = (fn: () => Promise<void>) => {
    return async () => {
      if (isSubmitting || createSubscriptionMutation.isPending) {
        console.log('⚠️ Preventing rapid submission');
        return;
      }
      await fn();
    };
  };

  return {
    createSubscription,
    isSubmitting: isSubmitting || createSubscriptionMutation.isPending,
    isCreating: createSubscriptionMutation.isPending,
    error: createSubscriptionMutation.error,
    preventRapidCalls,
  };
};

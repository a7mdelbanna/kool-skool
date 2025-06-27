
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionFormData {
  sessionCount: number;
  durationMonths: number;
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

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const getCurrentUserId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.user_id;
  };

  const createSubscriptionMutation = useMutation({
    mutationFn: async (formData: SubscriptionFormData) => {
      const schoolId = getSchoolId();
      const currentUserId = getCurrentUserId();
      
      if (!schoolId || !currentUserId) {
        throw new Error('School ID or User ID not found');
      }

      console.log('🎯 Creating subscription with data:', formData);

      // Validate that account currency matches subscription currency
      if (formData.initialPayment.accountId && formData.initialPayment.amount > 0) {
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('currency_code, currencies(code)')
          .eq('id', formData.initialPayment.accountId)
          .single();

        if (accountError) throw accountError;

        const accountCurrency = accountData.currencies?.code || accountData.currency_code;
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
          p_start_date: formData.startDate.toISOString().split('T')[0],
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

      // If there's an initial payment, create it as a transaction
      if (formData.initialPayment.amount > 0 && formData.initialPayment.accountId) {
        console.log('💰 Creating initial payment transaction...');
        
        const { data: transactionId, error: transactionError } = await supabase.rpc('create_transaction', {
          p_school_id: schoolId,
          p_type: 'income',
          p_amount: formData.initialPayment.amount,
          p_currency: formData.currency,
          p_transaction_date: formData.startDate.toISOString().split('T')[0],
          p_description: `Initial payment for subscription`,
          p_notes: formData.initialPayment.notes || 'Initial subscription payment',
          p_to_account_id: formData.initialPayment.accountId,
          p_payment_method: formData.initialPayment.method,
          p_tag_ids: null
        });

        if (transactionError) {
          console.error('❌ Transaction creation error:', transactionError);
          throw transactionError;
        }

        // Link the transaction to the subscription
        const { error: linkError } = await supabase
          .from('transactions')
          .update({ subscription_id: subscriptionId })
          .eq('id', transactionId);

        if (linkError) {
          console.error('❌ Transaction linking error:', linkError);
          throw linkError;
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

  return {
    createSubscription,
    isSubmitting: isSubmitting || createSubscriptionMutation.isPending,
    error: createSubscriptionMutation.error,
  };
};

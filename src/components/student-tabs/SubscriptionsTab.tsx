
import React, { useState } from 'react';
import { Plus, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Subscription, deleteStudentSubscriptionEnhanced, RpcResponse, supabase } from '@/integrations/supabase/client';
import EditSubscriptionDialog from './EditSubscriptionDialog';
import AddSubscriptionDialog from './AddSubscriptionDialog';
import SubscriptionCard from './SubscriptionCard';

interface SubscriptionsTabProps {
  studentId: string;
  isLoading?: boolean;
}

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  studentId,
  isLoading = false
}) => {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Fetch subscriptions using RPC function
  const { data: subscriptions = [], isLoading: subscriptionsLoading, error: subscriptionsError, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['student-subscriptions-rpc', studentId],
    queryFn: async () => {
      console.log('🚀 FETCHING SUBSCRIPTIONS VIA RPC');
      console.log('Student ID:', studentId);
      
      if (!studentId) {
        console.log('❌ No student ID provided');
        return [];
      }
      
      try {
        // Use the RPC function to get subscriptions
        const { data: subscriptionsData, error } = await supabase.rpc('get_student_subscriptions', {
          p_student_id: studentId
        });
        
        console.log('📊 RPC subscriptions result:', {
          data: subscriptionsData,
          error: error,
          dataLength: subscriptionsData?.length || 0
        });
        
        if (error) {
          console.error('❌ RPC subscription fetch error:', error);
          throw error;
        }

        if (!subscriptionsData || subscriptionsData.length === 0) {
          console.log('✅ No subscriptions found via RPC');
          return [];
        }

        console.log('💰 Calculating total paid for each subscription...');
        
        // Calculate total paid for each subscription
        const subscriptionsWithPayments = await Promise.all(
          subscriptionsData.map(async (subscription, index) => {
            console.log(`💳 Processing subscription ${index + 1}/${subscriptionsData.length}:`, subscription.id);
            
            try {
              // Get payments for this student
              const { data: studentPayments, error: studentPaymentsError } = await supabase
                .from('student_payments')
                .select('amount')
                .eq('student_id', studentId);

              console.log(`💸 Student payments query result:`, {
                payments: studentPayments,
                error: studentPaymentsError,
                paymentsCount: studentPayments?.length || 0
              });

              // Get transaction payments for this subscription
              const { data: transactionPayments, error: transactionError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('subscription_id', subscription.id)
                .eq('type', 'income')
                .eq('status', 'completed');

              console.log(`💰 Transaction payments query result:`, {
                payments: transactionPayments,
                error: transactionError,
                paymentsCount: transactionPayments?.length || 0
              });

              // Calculate total from both sources
              const studentPaymentTotal = (studentPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
              const transactionPaymentTotal = (transactionPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
              const totalPaid = studentPaymentTotal + transactionPaymentTotal;

              console.log(`✅ Total calculations for subscription ${subscription.id}:`, {
                studentPaymentTotal,
                transactionPaymentTotal,
                totalPaid
              });

              return {
                ...subscription,
                total_paid: totalPaid
              };
            } catch (error) {
              console.error('❌ Error calculating payments for subscription:', subscription.id, error);
              return {
                ...subscription,
                total_paid: 0
              };
            }
          })
        );
        
        console.log('🎉 FINAL SUBSCRIPTIONS WITH PAYMENTS:', subscriptionsWithPayments);
        console.log('📊 Total subscriptions to return:', subscriptionsWithPayments.length);
        
        return subscriptionsWithPayments;
      } catch (error) {
        console.error('❌ CRITICAL ERROR in RPC subscription fetch:', error);
        throw error;
      }
    },
    enabled: !!studentId,
    retry: 2,
    staleTime: 10000,
    gcTime: 60000,
  });

  // Handle subscription deletion
  const handleDeleteSubscription = async (subscriptionId: string) => {
    try {
      setDeletingId(subscriptionId);
      console.log('🗑️ Deleting subscription:', subscriptionId);
      
      const response = await deleteStudentSubscriptionEnhanced(subscriptionId);
      console.log('✅ Delete response:', response);
      
      const typedResponse = response as RpcResponse;
      if (typedResponse && !typedResponse.success) {
        throw new Error(typedResponse.message || 'Failed to delete subscription');
      }

      toast({
        title: "Success",
        description: typedResponse?.message || "Subscription deleted successfully!",
      });

      console.log('🔄 Triggering refresh after deletion');
      refetchSubscriptions();
    } catch (error: any) {
      console.error('❌ Error deleting subscription:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete subscription",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSubscription = (subscription: Subscription) => {
    console.log('✏️ Editing subscription:', subscription.id);
    setEditingSubscription(subscription);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    console.log('✅ Edit successful, refreshing data');
    setEditingSubscription(null);
    setEditDialogOpen(false);
    refetchSubscriptions();
  };

  const handleAddSuccess = () => {
    console.log('➕ Add successful, refreshing data');
    setAddDialogOpen(false);
    refetchSubscriptions();
  };

  // Show loading state
  if (isLoading || subscriptionsLoading) {
    console.log('⏳ SubscriptionsTab - Rendering loading state');
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <p className="text-gray-600">Loading subscriptions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (subscriptionsError) {
    console.error('❌ Subscription error:', subscriptionsError);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <p className="text-red-600">Failed to load subscriptions. Please try refreshing.</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 SubscriptionsTab - Rendering main content');
  console.log('  - Will show empty state?', !subscriptions || subscriptions.length === 0);
  console.log('  - Will show subscription cards?', subscriptions && subscriptions.length > 0);

  return (
    <div className="space-y-8">
      {/* Create New Subscription Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Create New Subscription</h3>
          </div>
        </div>
        <p className="text-blue-700 mb-4">Set up a new subscription plan for this student with scheduled sessions and payment details.</p>
        <Button 
          onClick={() => {
            console.log('➕ Create subscription button clicked');
            setAddDialogOpen(true);
          }} 
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Subscription
        </Button>
      </div>

      {/* Current Subscriptions Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Current Subscriptions</h3>
          {subscriptions && subscriptions.length > 0 && (
            <span className="text-sm text-gray-500">({subscriptions.length} total)</span>
          )}
        </div>

        {!subscriptions || subscriptions.length === 0 ? (
          <>
            {console.log('🔸 Rendering empty state')}
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
                <p className="text-gray-600 mb-4 text-center">
                  This student doesn't have any subscriptions yet.<br/>
                  Create a subscription to get started with scheduled sessions and payments.
                </p>
                <Button 
                  onClick={() => {
                    console.log('➕ Create first subscription button clicked');
                    setAddDialogOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Subscription
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {console.log('🔸 Rendering subscription cards:', subscriptions.length)}
            <div className="space-y-4">
              {subscriptions.map((subscription, index) => {
                console.log(`🎯 Rendering subscription card ${index + 1}:`, subscription.id);
                return (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onEdit={handleEditSubscription}
                    onDelete={handleDeleteSubscription}
                    isDeleting={deletingId === subscription.id}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Debug Info Card - Remove this in production */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm font-medium text-gray-700">Debug Info</h4>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Student ID: {studentId}</div>
              <div>Subscriptions Count: {subscriptions?.length || 0}</div>
              <div>Is Loading: {subscriptionsLoading.toString()}</div>
              <div>Has Error: {!!subscriptionsError}</div>
              <div>Array Check: {Array.isArray(subscriptions).toString()}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <EditSubscriptionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        subscription={editingSubscription}
        onSuccess={handleEditSuccess}
      />

      <AddSubscriptionDialog
        studentId={studentId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};

export default SubscriptionsTab;

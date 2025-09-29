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

  // Fetch subscriptions using RPC function with real-time session progress
  const { data: subscriptions = [], isLoading: subscriptionsLoading, error: subscriptionsError, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['student-subscriptions-rpc', studentId],
    queryFn: async () => {
      console.log('🚀 FETCHING SUBSCRIPTIONS VIA RPC WITH REAL-TIME SESSION PROGRESS');
      console.log('Student ID:', studentId);
      
      if (!studentId) {
        console.log('❌ No student ID provided');
        return [];
      }
      
      try {
        // Use the RPC function to get subscriptions with real-time session progress
        const { data: subscriptionsData, error } = await supabase.rpc('get_student_subscriptions', {
          p_student_id: studentId
        });
        
        console.log('📊 RPC subscriptions result with real-time progress:', {
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

        console.log('💰 Calculating total paid for each subscription with real-time progress...');
        
        // Calculate total paid for each subscription (keeping payment calculation logic)
        const subscriptionsWithPayments = await Promise.all(
          subscriptionsData.map(async (subscription, index) => {
            console.log(`💳 Processing subscription ${index + 1}/${subscriptionsData.length}:`, {
              id: subscription.id,
              sessions_completed: subscription.sessions_completed,
              sessions_attended: subscription.sessions_attended,
              sessions_cancelled: subscription.sessions_cancelled,
              sessions_scheduled: subscription.sessions_scheduled
            });
            
            try {
              // Get payments for this student from Firebase
              let studentPayments = [];
              let studentPaymentsError = null;
              
              try {
                // Import databaseService if not already imported
                const { databaseService } = await import('@/services/firebase/database.service');
                
                // Query payments linked to this student from Firebase
                const payments = await databaseService.query('payments', {
                  where: [
                    { field: 'student_id', operator: '==', value: studentId },
                    { field: 'type', operator: '==', value: 'income' }
                  ]
                });
                
                studentPayments = payments.map((p: any) => ({ amount: p.amount }));
              } catch (error) {
                console.error('Error fetching student payments from Firebase:', error);
                studentPaymentsError = error;
              }

              console.log(`💸 Student payments query result from Firebase:`, {
                payments: studentPayments,
                error: studentPaymentsError,
                paymentsCount: studentPayments?.length || 0
              });

              // Get transaction payments for this subscription using Firebase
              let transactionPayments = [];
              let transactionError = null;
              
              try {
                // Import databaseService if not already imported
                const { databaseService } = await import('@/services/firebase/database.service');
                
                // Query transactions linked to this subscription
                const transactions = await databaseService.query('transactions', {
                  where: [
                    { field: 'subscription_id', operator: '==', value: subscription.id },
                    { field: 'type', operator: '==', value: 'income' }
                  ]
                });
                
                transactionPayments = transactions.map((t: any) => ({ amount: t.amount }));
              } catch (error) {
                console.error('Error fetching transaction payments:', error);
                transactionError = error;
              }

              console.log(`💰 Transaction payments query result:`, {
                payments: transactionPayments,
                error: transactionError,
                paymentsCount: transactionPayments?.length || 0
              });

              // Calculate total from both sources (now both from Firebase)
              const studentPaymentTotal = (studentPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
              const transactionPaymentTotal = (transactionPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
              // Avoid double counting - use the higher of the two totals or combine if different payment types
              const totalPaid = Math.max(studentPaymentTotal, transactionPaymentTotal);

              console.log(`✅ Total calculations for subscription ${subscription.id} (Firebase only):`, {
                studentPaymentTotal,
                transactionPaymentTotal,
                totalPaid: totalPaid,
                source: 'Firebase only',
                subscriptionPrice: subscription.price,
                realTimeProgress: {
                  completed: subscription.sessions_completed,
                  attended: subscription.sessions_attended,
                  cancelled: subscription.sessions_cancelled,
                  scheduled: subscription.sessions_scheduled
                }
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
        
        console.log('🎉 FINAL SUBSCRIPTIONS WITH REAL-TIME PROGRESS AND PAYMENTS:', subscriptionsWithPayments);
        console.log('📊 Total subscriptions to return with enhanced data:', subscriptionsWithPayments.length);
        
        return subscriptionsWithPayments;
      } catch (error) {
        console.error('❌ CRITICAL ERROR in RPC subscription fetch with real-time progress:', error);
        throw error;
      }
    },
    enabled: !!studentId,
    retry: 2,
    staleTime: 5000, // Reduced stale time for more frequent updates
    gcTime: 30000, // Reduced cache time for fresher data
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
    console.log('✅ Edit successful, refreshing data with real-time progress');
    setEditingSubscription(null);
    setEditDialogOpen(false);
    refetchSubscriptions();
  };

  const handleAddSuccess = () => {
    console.log('➕ Add successful, refreshing data with real-time progress');
    setAddDialogOpen(false);
    refetchSubscriptions();
  };

  const handleRenewSuccess = () => {
    console.log('🔄 Renew successful, refreshing data with real-time progress');
    refetchSubscriptions();
  };

  // Show loading state
  if (isLoading || subscriptionsLoading) {
    console.log('⏳ SubscriptionsTab - Rendering loading state');
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading subscriptions with real-time progress...</p>
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
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-destructive">Failed to load subscriptions. Please try refreshing.</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 SubscriptionsTab - Rendering main content with real-time progress');
  console.log('  - Will show empty state?', !subscriptions || subscriptions.length === 0);
  console.log('  - Will show subscription cards with enhanced progress?', subscriptions && subscriptions.length > 0);

  return (
    <div className="space-y-8">
      {/* Create New Subscription Section */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Create New Subscription</h3>
          </div>
        </div>
        <p className="text-muted-foreground mb-4">Set up a new subscription plan for this student with scheduled sessions and payment details.</p>
        <Button
          onClick={() => {
            console.log('➕ Create subscription button clicked');
            setAddDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Subscription
        </Button>
      </div>

      {/* Current Subscriptions Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Current Subscriptions</h3>
          {subscriptions && subscriptions.length > 0 && (
            <span className="text-sm text-muted-foreground">({subscriptions.length} total with real-time progress)</span>
          )}
        </div>

        {!subscriptions || subscriptions.length === 0 ? (
          <>
            {console.log('🔸 Rendering empty state')}
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No subscriptions found</h3>
                <p className="text-muted-foreground mb-4 text-center">
                  This student doesn't have any subscriptions yet.<br/>
                  Create a subscription to get started with scheduled sessions and payments.
                </p>
                <Button
                  onClick={() => {
                    console.log('➕ Create first subscription button clicked');
                    setAddDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Subscription
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {console.log('🔸 Rendering subscription cards with real-time progress:', subscriptions.length)}
            <div className="space-y-4">
              {subscriptions.map((subscription, index) => {
                console.log(`🎯 Rendering enhanced subscription card ${index + 1}:`, {
                  id: subscription.id,
                  progress: {
                    completed: subscription.sessions_completed,
                    attended: subscription.sessions_attended,
                    cancelled: subscription.sessions_cancelled,
                    scheduled: subscription.sessions_scheduled
                  }
                });
                return (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onEdit={handleEditSubscription}
                    onDelete={handleDeleteSubscription}
                    onRenew={handleRenewSuccess}
                    isDeleting={deletingId === subscription.id}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

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

import React, { useState } from 'react';
import { Plus, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Subscription, deleteStudentSubscriptionEnhanced, RpcResponse } from '@/integrations/supabase/client';
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

  // Fetch subscriptions from Firebase with real-time session progress
  const { data: subscriptions = [], isLoading: subscriptionsLoading, error: subscriptionsError, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['student-subscriptions-firebase', studentId],
    queryFn: async () => {
      console.log('🚀 FETCHING SUBSCRIPTIONS FROM FIREBASE WITH REAL-TIME SESSION PROGRESS');
      console.log('Student ID:', studentId);
      
      if (!studentId) {
        console.log('❌ No student ID provided');
        return [];
      }
      
      try {
        // Import databaseService
        const { databaseService } = await import('@/services/firebase/database.service');
        
        // Fetch subscriptions from Firebase
        const subscriptionsData = await databaseService.query('subscriptions', {
          where: [{ field: 'student_id', operator: '==', value: studentId }]
        });
        
        console.log('📊 Firebase subscriptions result with real-time progress:', {
          data: subscriptionsData,
          dataLength: subscriptionsData?.length || 0
        });

        if (!subscriptionsData || subscriptionsData.length === 0) {
          console.log('✅ No subscriptions found in Firebase');
          return [];
        }
        
        // Now fetch sessions for each subscription to calculate progress
        const subscriptionsWithProgress = await Promise.all(
          subscriptionsData.map(async (subscription) => {
            try {
              // Fetch sessions for this subscription
              const sessions = await databaseService.query('sessions', {
                where: [{ field: 'subscription_id', operator: '==', value: subscription.id }],
                orderBy: [{ field: 'date', direction: 'asc' }]
              });
              
              // Calculate session counts
              const completedSessions = sessions.filter((s: any) => 
                s.status === 'completed' || s.status === 'attended'
              ).length;
              
              const attendedSessions = sessions.filter((s: any) => 
                s.status === 'attended'
              ).length;
              
              const cancelledSessions = sessions.filter((s: any) => 
                s.status === 'cancelled'
              ).length;
              
              const scheduledSessions = sessions.filter((s: any) => 
                s.status === 'scheduled' || s.status === 'upcoming'
              ).length;
              
              return {
                ...subscription,
                sessions_completed: completedSessions,
                sessions_attended: attendedSessions,
                sessions_cancelled: cancelledSessions,
                sessions_scheduled: scheduledSessions,
                total_sessions: sessions.length
              };
            } catch (error) {
              console.error('Error fetching sessions for subscription:', subscription.id, error);
              return {
                ...subscription,
                sessions_completed: 0,
                sessions_attended: 0,
                sessions_cancelled: 0,
                sessions_scheduled: 0,
                total_sessions: 0
              };
            }
          })
        );

        console.log('💰 Calculating total paid for each subscription with real-time progress...');
        
        // Calculate total paid for each subscription (keeping payment calculation logic)
        const subscriptionsWithPayments = await Promise.all(
          subscriptionsWithProgress.map(async (subscription, index) => {
            console.log(`💳 Processing subscription ${index + 1}/${subscriptionsWithProgress.length}:`, {
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
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <p className="text-gray-600">Loading subscriptions with real-time progress...</p>
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

  console.log('🎨 SubscriptionsTab - Rendering main content with real-time progress');
  console.log('  - Will show empty state?', !subscriptions || subscriptions.length === 0);
  console.log('  - Will show subscription cards with enhanced progress?', subscriptions && subscriptions.length > 0);

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
            <span className="text-sm text-gray-500">({subscriptions.length} total with real-time progress)</span>
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

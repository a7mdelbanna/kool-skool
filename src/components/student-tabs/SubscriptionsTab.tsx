
import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Subscription, deleteStudentSubscriptionEnhanced, RpcResponse } from '@/integrations/supabase/client';
import EditSubscriptionDialog from './EditSubscriptionDialog';
import AddSubscriptionDialog from './AddSubscriptionDialog';
import SubscriptionCard from './SubscriptionCard';

interface SubscriptionsTabProps {
  subscriptions: (Subscription & { total_paid?: number })[];
  onRefresh: () => void;
  studentId: string;
  isLoading?: boolean;
}

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  subscriptions,
  onRefresh,
  studentId,
  isLoading = false
}) => {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Log when subscriptions prop changes
  useEffect(() => {
    console.log('📊 SubscriptionsTab received subscriptions:', {
      count: subscriptions?.length || 0,
      isLoading,
      studentId,
      subscriptionsWithPayments: subscriptions?.map(s => ({
        id: s.id,
        total_price: s.total_price,
        total_paid: s.total_paid
      }))
    });
  }, [subscriptions, isLoading, studentId]);

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
      onRefresh();
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
    onRefresh();
  };

  const handleAddSuccess = () => {
    console.log('➕ Add successful, refreshing data');
    setAddDialogOpen(false);
    onRefresh();
  };

  // Loading state
  if (isLoading) {
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
          onClick={() => setAddDialogOpen(true)} 
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
        </div>

        {!subscriptions || subscriptions.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
              <p className="text-gray-600 mb-4">This student doesn't have any active subscriptions yet.</p>
              <Button 
                onClick={() => setAddDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Subscription
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onEdit={handleEditSubscription}
                onDelete={handleDeleteSubscription}
                isDeleting={deletingId === subscription.id}
              />
            ))}
          </div>
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

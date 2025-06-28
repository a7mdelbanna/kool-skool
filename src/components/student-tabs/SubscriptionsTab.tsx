
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Subscription, deleteStudentSubscriptionEnhanced, RpcResponse } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import EditSubscriptionDialog from './EditSubscriptionDialog';
import AddSubscriptionDialog from './AddSubscriptionDialog';

interface SubscriptionsTabProps {
  subscriptions: Subscription[];
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
      subscriptions: subscriptions
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

  const formatSchedule = (schedule: any) => {
    try {
      if (typeof schedule === 'string') {
        const parsed = JSON.parse(schedule);
        return Array.isArray(parsed) 
          ? parsed.map(s => `${s.day} at ${s.time}`).join(', ')
          : schedule;
      }
      if (Array.isArray(schedule)) {
        return schedule.map(s => `${s.day} at ${s.time}`).join(', ');
      }
      return JSON.stringify(schedule);
    } catch {
      return schedule?.toString() || 'No schedule';
    }
  };

  const getPaymentStatus = (subscription: Subscription) => {
    const totalPaid = (subscription as any).total_paid || 0;
    const totalPrice = subscription.total_price || 0;
    
    if (totalPaid >= totalPrice) return { status: 'Fully Paid', color: 'bg-green-100 text-green-800' };
    if (totalPaid > 0) return { status: 'Partially Paid', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'Unpaid', color: 'bg-red-100 text-red-800' };
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
            {subscriptions.map((subscription) => {
              const paymentStatus = getPaymentStatus(subscription);
              const sessionsCompleted = (subscription as any).sessions_completed || 0;
              
              return (
                <Card key={subscription.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium text-gray-900">
                        {subscription.session_count} Sessions - {subscription.duration_months} Month{subscription.duration_months !== 1 ? 's' : ''}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSubscription(subscription)}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={deletingId === subscription.id}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this subscription and all related sessions and payments. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={deletingId === subscription.id}
                                onClick={() => handleDeleteSubscription(subscription.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {deletingId === subscription.id ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Start Date: {format(new Date(subscription.start_date), 'MMMM dd, yyyy')}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Payment Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Payment Information</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Subscription</p>
                          <p className="font-semibold text-gray-900">
                            {subscription.currency} {subscription.total_price?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                          <p className="font-semibold text-green-600">
                            {subscription.currency} {((subscription as any).total_paid || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Remaining</p>
                          <p className="font-semibold text-red-600">
                            {subscription.currency} {(subscription.total_price - ((subscription as any).total_paid || 0)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Badge className={`${paymentStatus.color} border-0`}>
                          {paymentStatus.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Session Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Session Progress</span>
                        <span className="text-sm text-gray-600">
                          {sessionsCompleted} / {subscription.session_count} completed
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((sessionsCompleted / subscription.session_count) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Schedule */}
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Schedule</p>
                      <p className="text-sm text-gray-600">{formatSchedule(subscription.schedule)}</p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">Status:</span>
                        <Badge variant="outline" className={
                          subscription.status === 'active' ? 'border-green-300 text-green-700' :
                          subscription.status === 'paused' ? 'border-yellow-300 text-yellow-700' :
                          subscription.status === 'completed' ? 'border-blue-300 text-blue-700' :
                          'border-red-300 text-red-700'
                        }>
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </Badge>
                      </div>
                      {subscription.price_mode === 'perSession' && (
                        <p className="text-sm text-gray-600">
                          {subscription.currency} {subscription.price_per_session}/session
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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

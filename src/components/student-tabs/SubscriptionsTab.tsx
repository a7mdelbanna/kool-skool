import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Calendar, Clock, DollarSign, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Subscription, deleteStudentSubscriptionEnhanced, RpcResponse } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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

  // Log when component receives new data
  useEffect(() => {
    console.log('===== SUBSCRIPTIONS TAB RENDER =====');
    console.log('Subscriptions received:', subscriptions.length);
    console.log('Student ID:', studentId);
    console.log('Is loading:', isLoading);
    console.log('===== END SUBSCRIPTIONS TAB RENDER =====');
  }, [subscriptions, studentId, isLoading]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'paused': return AlertCircle;
      case 'completed': return CheckCircle;
      case 'cancelled': return AlertCircle;
      default: return AlertCircle;
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    try {
      setDeletingId(subscriptionId);
      console.log('Deleting subscription:', subscriptionId);
      
      const response = await deleteStudentSubscriptionEnhanced(subscriptionId);
      console.log('Delete response:', response);
      
      // Type the response properly as RpcResponse
      const typedResponse = response as RpcResponse;
      if (typedResponse && !typedResponse.success) {
        throw new Error(typedResponse.message || 'Failed to delete subscription');
      }

      toast({
        title: "Success",
        description: typedResponse?.message || "Subscription deleted successfully!",
      });

      onRefresh();
    } catch (error: any) {
      console.error('Error deleting subscription:', error);
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
    setEditingSubscription(subscription);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditingSubscription(null);
    setEditDialogOpen(false);
    onRefresh();
  };

  const handleAddSuccess = () => {
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Subscriptions</h3>
            <p className="text-sm text-gray-600">Manage student subscription plans and schedules</p>
          </div>
          <Button 
            onClick={() => setAddDialogOpen(true)} 
            className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <p className="text-gray-600">Loading subscriptions...</p>
          </div>
        </div>

        <AddSubscriptionDialog
          studentId={studentId}
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={handleAddSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Current Subscriptions</h3>
          <p className="text-sm text-gray-600">Manage student subscription plans and schedules</p>
        </div>
        <Button 
          onClick={() => setAddDialogOpen(true)} 
          className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first subscription plan</p>
          <Button 
            onClick={() => setAddDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add First Subscription
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {subscriptions.map((subscription) => {
            const StatusIcon = getStatusIcon(subscription.status);
            return (
              <Card key={subscription.id} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <CardTitle className="text-sm font-medium text-gray-900">
                        {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                      </CardTitle>
                    </div>
                    <Badge className={cn("text-xs font-medium border", getStatusColor(subscription.status))}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Schedule */}
                  <div className="flex items-start space-x-2">
                    <Clock className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {formatSchedule(subscription.schedule)}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {subscription.price_mode === 'perSession' ? 'Per Session' : 'Fixed Price'}: {subscription.currency} {subscription.total_price}
                      </p>
                      {subscription.price_mode === 'perSession' && subscription.price_per_session && (
                        <p className="text-xs text-gray-500">
                          {subscription.currency} {subscription.price_per_session} × {subscription.session_count} sessions
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sessions */}
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {(subscription as any).sessions_completed || 0} / {subscription.session_count} Sessions
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round((((subscription as any).sessions_completed || 0) / subscription.session_count) * 100)}%
                        </p>
                      </div>
                      <div className="mt-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((((subscription as any).sessions_completed || 0) / subscription.session_count) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Duration: {subscription.duration_months} month{subscription.duration_months !== 1 ? 's' : ''}
                      {(subscription as any).end_date && (
                        <> • Ends {format(new Date((subscription as any).end_date), 'MMM dd, yyyy')}</>
                      )}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 flex justify-between items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSubscription(subscription)}
                      className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
                    >
                      <Edit3 className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={deletingId === subscription.id}
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this subscription and all related session data.
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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

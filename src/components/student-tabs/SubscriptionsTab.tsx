import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Calendar, Clock, DollarSign, Users, AlertCircle, CheckCircle } from 'lucide-react';
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

interface SubscriptionsTabProps {
  subscriptions: Subscription[];
  onRefresh: () => void;
  onAddSubscription: () => void;
}

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  subscriptions,
  onRefresh,
  onAddSubscription
}) => {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'paused': return 'yellow';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'gray';
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

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={onAddSubscription} className="bg-green-500 text-white hover:bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center text-gray-500">No subscriptions found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="bg-white shadow-md rounded-md overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Calendar className="mr-2 h-4 w-4 inline-block" />
                  {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                </CardTitle>
                <Badge variant="secondary" className={`bg-${getStatusColor(subscription.status)}-500 text-white`}>
                  {subscription.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center mb-1">
                    <Clock className="mr-2 h-4 w-4 inline-block" />
                    {subscription.schedule && typeof subscription.schedule === 'string' ? (
                      <span>{subscription.schedule}</span>
                    ) : (
                      <span>{JSON.stringify(subscription.schedule)}</span>
                    )}
                  </div>
                  <div className="flex items-center mb-1">
                    <DollarSign className="mr-2 h-4 w-4 inline-block" />
                    {subscription.price_mode}: {subscription.currency} {subscription.total_price}
                  </div>
                  <div className="flex items-center mb-1">
                    <Users className="mr-2 h-4 w-4 inline-block" />
                    {subscription.session_count} Sessions
                  </div>
                </div>
              </CardContent>
              <div className="p-2 flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSubscription(subscription)}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deletingId === subscription.id}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. Are you sure you want to delete this subscription?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={deletingId === subscription.id}
                        onClick={() => handleDeleteSubscription(subscription.id)}
                      >
                        {deletingId === subscription.id ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      <EditSubscriptionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        subscription={editingSubscription}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default SubscriptionsTab;

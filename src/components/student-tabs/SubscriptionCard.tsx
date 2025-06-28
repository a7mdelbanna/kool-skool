import React, { useState } from 'react';
import { Edit, Trash2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Subscription, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

interface ExtendedSubscription extends Subscription {
  total_paid?: number;
  sessions_completed?: number;
  sessions_attended?: number;
  sessions_cancelled?: number;
  sessions_scheduled?: number;
}

interface SubscriptionCardProps {
  subscription: ExtendedSubscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (subscriptionId: string) => void;
  onRenew?: () => void;
  isDeleting: boolean;
}

// Type definition for the RPC response
interface RenewSubscriptionResponse {
  success: boolean;
  message: string;
  new_subscription_id?: string;
  new_start_date?: string;
  new_end_date?: string;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  onDelete,
  onRenew,
  isDeleting
}) => {
  const { toast } = useToast();
  const [isRenewing, setIsRenewing] = useState(false);

  // Get current user data from localStorage
  const getCurrentUserData = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return {
      userId: user.user_id || user.id || user.userId,
      schoolId: user.schoolId
    };
  };

  const handleRenewSubscription = async () => {
    const userData = getCurrentUserData();
    if (!userData) {
      toast({
        title: "Error",
        description: "User authentication data not found",
        variant: "destructive",
      });
      return;
    }

    if (!userData.userId || !userData.schoolId) {
      toast({
        title: "Error",
        description: "Missing user ID or school ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRenewing(true);
      
      console.log('🔄 Renewing subscription:', {
        subscriptionId: subscription.id,
        userId: userData.userId,
        schoolId: userData.schoolId
      });
      
      const { data, error } = await supabase.rpc('renew_subscription', {
        p_subscription_id: subscription.id,
        p_current_user_id: userData.userId,
        p_current_school_id: userData.schoolId
      });

      console.log('📊 RPC call result:', { data, error });

      if (error) {
        console.error('❌ RPC Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response from renewal function');
      }

      console.log('✅ Raw renewal response:', data);

      // Handle the response - it should be a JSONB object
      let response: RenewSubscriptionResponse;
      
      if (typeof data === 'string') {
        try {
          response = JSON.parse(data);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error('Invalid response format from server');
        }
      } else if (typeof data === 'object' && data !== null) {
        response = data as RenewSubscriptionResponse;
      } else {
        throw new Error('Unexpected response format from server');
      }

      console.log('📋 Parsed response:', response);

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Subscription renewed successfully!",
        });

        // Trigger refresh if callback provided
        if (onRenew) {
          onRenew();
        }
      } else {
        throw new Error(response.message || 'Failed to renew subscription');
      }
    } catch (error: any) {
      console.error('❌ Complete error details:', {
        error,
        message: error.message,
        stack: error.stack
      });
      
      toast({
        title: "Error",
        description: error.message || "Failed to renew subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRenewing(false);
    }
  };

  const getPaymentStatus = () => {
    const totalPaid = subscription.total_paid || 0;
    const totalPrice = subscription.total_price || 0;
    
    if (totalPaid >= totalPrice) return { status: 'Fully Paid', color: 'bg-green-100 text-green-800' };
    if (totalPaid > 0) return { status: 'Partially Paid', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'Unpaid', color: 'bg-red-100 text-red-800' };
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

  const paymentStatus = getPaymentStatus();
  const totalPaid = subscription.total_paid || 0;
  const totalPrice = subscription.total_price || 0;
  const remaining = Math.max(totalPrice - totalPaid, 0);

  // Use real-time session progress data from the database function
  const sessionsCompleted = subscription.sessions_completed || 0;
  const sessionsAttended = subscription.sessions_attended || 0;
  const sessionsCancelled = subscription.sessions_cancelled || 0;
  const sessionsScheduled = subscription.sessions_scheduled || 0;
  const sessionCount = subscription.session_count || 0;

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-gray-900">
            {subscription.session_count} Sessions - {subscription.duration_months} Month{subscription.duration_months !== 1 ? 's' : ''}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(subscription)}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isRenewing}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Renew Subscription</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a new subscription with the same details as this one. 
                    The start date will be automatically calculated based on the current subscription's end date and schedule.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isRenewing}
                    onClick={handleRenewSubscription}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isRenewing ? 'Renewing...' : 'Renew Subscription'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isDeleting}
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
                    disabled={isDeleting}
                    onClick={() => onDelete(subscription.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
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
                {subscription.currency} {totalPrice.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Paid</p>
              <p className="font-semibold text-green-600">
                {subscription.currency} {totalPaid.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Remaining</p>
              <p className="font-semibold text-red-600">
                {subscription.currency} {remaining.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Badge className={`${paymentStatus.color} border-0`}>
              {paymentStatus.status}
            </Badge>
          </div>
        </div>

        {/* Enhanced Session Progress with Real-time Data */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Session Progress</h4>
          
          {/* Main Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Overall Progress</span>
              <span className="text-sm text-gray-600">
                {sessionsCompleted} / {sessionCount} completed
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((sessionsCompleted / sessionCount) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Session Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-sm font-semibold text-green-600">{sessionsAttended}</p>
              <p className="text-xs text-gray-600">Attended</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-red-600">{sessionsCancelled}</p>
              <p className="text-xs text-gray-600">Cancelled</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-blue-600">{sessionsScheduled}</p>
              <p className="text-xs text-gray-600">Scheduled</p>
            </div>
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
};

export default SubscriptionCard;

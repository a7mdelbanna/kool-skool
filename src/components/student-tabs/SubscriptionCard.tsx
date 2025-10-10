import React, { useState } from 'react';
import { Edit, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Subscription, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
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
  debug?: any;
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

  // Fetch first session date if subscription doesn't have a start_date (for renewed subscriptions)
  const { data: firstSessionData } = useQuery({
    queryKey: ['subscription-first-session', subscription?.id],
    queryFn: async () => {
      if (!subscription?.id) return null;
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select('scheduled_date')
        .eq('subscription_id', subscription.id)
        .order('scheduled_date', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Error fetching first session:', error);
        return null;
      }

      return data?.[0] || null;
    },
    enabled: !!subscription?.id && !subscription?.start_date
  });

  // Use subscription start_date if available, otherwise use first session date
  const displayStartDate = subscription?.start_date || firstSessionData?.scheduled_date;

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

  const testSubscriptionAccess = async () => {
    const userData = getCurrentUserData();
    if (!userData?.schoolId) return;

    try {
      console.log('🔍 Testing subscription access with debug function...');
      
      const { data: debugResult, error: debugError } = await supabase.rpc('debug_subscription_access', {
        p_subscription_id: subscription.id,
        p_school_id: userData.schoolId
      });

      console.log('🔍 Debug access test result:', { debugResult, debugError });
      
      if (debugError) {
        console.error('❌ Debug test error:', debugError);
      } else {
        console.log('📊 Access test details:', debugResult);
      }
    } catch (error) {
      console.error('❌ Failed to run debug test:', error);
    }
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
      
      console.log('🔄 Renewing subscription with enhanced debugging:', {
        subscriptionId: subscription.id,
        userId: userData.userId,
        schoolId: userData.schoolId
      });

      // First, test subscription access for debugging
      await testSubscriptionAccess();
      
      const { data, error } = await supabase.rpc('renew_subscription', {
        p_subscription_id: subscription.id,
        p_current_user_id: userData.userId,
        p_current_school_id: userData.schoolId
      });

      console.log('📊 Enhanced RPC call result:', { data, error });

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

      console.log('✅ Raw renewal response with debug info:', data);

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
        response = data as unknown as RenewSubscriptionResponse;
      } else {
        throw new Error('Unexpected response format from server');
      }

      console.log('📋 Parsed response with debug data:', response);

      // Log debug information if available
      if (response.debug) {
        console.log('🐛 Debug information from server:', response.debug);
      }

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
        // Enhanced error message with debug info
        let errorMessage = response.message || 'Failed to renew subscription';
        if (response.debug) {
          console.error('🚨 Server debug info for failure:', response.debug);
          // Add debug info to user-friendly error if it provides useful context
          if (response.debug.check) {
            errorMessage += ` (Debug: ${response.debug.check} - ${response.debug.result})`;
          }
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Complete error details with enhanced debugging:', {
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
    
    if (totalPaid >= totalPrice) return { status: 'Fully Paid', color: 'bg-success/20 text-success' };
    if (totalPaid > 0) return { status: 'Partially Paid', color: 'bg-warning/20 text-warning' };
    return { status: 'Unpaid', color: 'bg-destructive/20 text-destructive' };
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
    <Card className="border hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {subscription.session_count} Sessions - {subscription.duration_months} Month{subscription.duration_months !== 1 ? 's' : ''}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(subscription)}
              className="text-primary hover:text-primary/80"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isRenewing}
                  className="text-success hover:text-success/80"
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
                    className="bg-success hover:bg-success/90 text-success-foreground"
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
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Permanently Delete Subscription?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p className="font-semibold text-foreground">
                      Are you sure you want to delete this subscription?
                    </p>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                      <p className="font-medium text-sm text-foreground">This will permanently delete:</p>
                      <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                        <li>All lesson sessions for this subscription</li>
                        <li>All payment records</li>
                        <li>All related notifications and tasks</li>
                      </ul>
                    </div>
                    <p className="text-destructive font-medium text-sm">
                      ⚠️ This action cannot be undone!
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeleting}
                    onClick={() => onDelete(subscription.id)}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Start Date: {displayStartDate ? format(new Date(displayStartDate), 'MMMM dd, yyyy') : 'Not set'}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Payment Information */}
        <div className="bg-surface rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-3">Payment Information</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Subscription</p>
              <p className="font-semibold text-foreground">
                {subscription.currency} {totalPrice.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
              <p className="font-semibold text-success">
                {subscription.currency} {totalPaid.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p className="font-semibold text-destructive">
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
        <div className="bg-primary/10 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-3">Session Progress</h4>
          
          {/* Main Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {sessionsCompleted} / {sessionCount} completed
              </span>
            </div>
            <div className="bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((sessionsCompleted / sessionCount) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Session Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-sm font-semibold text-success">{sessionsAttended}</p>
              <p className="text-xs text-muted-foreground">Attended</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-destructive">{sessionsCancelled}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-primary">{sessionsScheduled}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Schedule</p>
          <p className="text-sm text-muted-foreground">{formatSchedule(subscription.schedule)}</p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-foreground">Status:</span>
            <Badge variant="outline" className={
              subscription.status === 'active' ? 'border-success text-success' :
              subscription.status === 'paused' ? 'border-warning text-warning' :
              subscription.status === 'completed' ? 'border-primary text-primary' :
              'border-destructive text-destructive'
            }>
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </Badge>
          </div>
          {subscription.price_mode === 'perSession' && (
            <p className="text-sm text-muted-foreground">
              {subscription.currency} {subscription.price_per_session}/session
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionCard;

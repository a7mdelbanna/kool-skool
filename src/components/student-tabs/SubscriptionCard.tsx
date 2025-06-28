
import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Subscription } from '@/integrations/supabase/client';
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

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (subscriptionId: string) => void;
  isDeleting: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  onDelete,
  isDeleting
}) => {
  const getPaymentStatus = () => {
    const totalPaid = (subscription as any).total_paid || 0;
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
  const sessionsCompleted = (subscription as any).sessions_completed || 0;

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
};

export default SubscriptionCard;

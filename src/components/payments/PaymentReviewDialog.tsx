import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Calendar,
  User,
  FileText,
  Image as ImageIcon,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { databaseService } from '@/services/firebase/database.service';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface StudentPayment {
  id: string;
  subscription_id: string;
  student_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_account_id: string;
  payment_account_name: string;
  payment_status: 'pending_verification' | 'accepted' | 'declined';
  screenshot_url: string;
  notes?: string;
  submitted_at: string;
  admin_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

interface PaymentReviewDialogProps {
  payment: StudentPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const PaymentReviewDialog: React.FC<PaymentReviewDialogProps> = ({
  payment,
  open,
  onOpenChange,
  onSuccess
}) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  // Fetch student and subscription info when dialog opens
  React.useEffect(() => {
    if (payment && open) {
      fetchPaymentDetails();
    }
  }, [payment, open]);

  const fetchPaymentDetails = async () => {
    if (!payment) return;

    try {
      // Fetch student info
      const student = await databaseService.getById('students', payment.student_id);
      setStudentInfo(student);

      // Fetch subscription info from Firebase
      const subscription = await databaseService.getById('subscriptions', payment.subscription_id);
      setSubscriptionInfo(subscription);
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }
  };

  const handleAcceptPayment = async () => {
    if (!payment) return;

    try {
      setProcessing(true);
      setAction('accept');

      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const currentUserId = user?.user_id || user?.id || user?.userId;

      console.log('🎯 ACCEPTING PAYMENT:', {
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        subscriptionId: payment.subscription_id
      });

      // Step 1: Update payment status to accepted
      await databaseService.update('student_payments', payment.id, {
        payment_status: 'accepted',
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUserId,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString()
      });

      console.log('✅ Payment status updated to accepted');

      // Step 2: Get current subscription data from Supabase
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select('price, status')
        .eq('id', payment.subscription_id)
        .single();

      if (subError) {
        console.error('Error fetching subscription:', subError);
        throw subError;
      }

      console.log('📊 Current subscription data:', subscriptionData);

      // Step 3: Get total paid amount for this subscription from Firebase
      const allPayments = await databaseService.query('student_payments', {
        where: [
          { field: 'subscription_id', operator: '==', value: payment.subscription_id },
          { field: 'payment_status', operator: '==', value: 'accepted' }
        ]
      });

      const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      console.log('💰 Total paid after acceptance:', totalPaid);

      // Step 4: Create transaction record in Firebase for accounting
      const transactionData = {
        subscription_id: payment.subscription_id,
        student_id: payment.student_id,
        type: 'income',
        amount: payment.amount,
        currency: payment.currency,
        description: `Payment received - ${payment.payment_account_name}`,
        payment_method: payment.payment_method,
        payment_screenshot_url: payment.screenshot_url,
        notes: adminNotes || payment.notes || null,
        created_at: new Date().toISOString(),
        created_by: currentUserId
      };

      const transactionId = await databaseService.create('transactions', transactionData);
      console.log('📝 Transaction record created:', transactionId);

      // Step 5: Determine subscription payment status
      const subscriptionPrice = subscriptionData.price || 0;
      let newSubscriptionStatus = subscriptionData.status;

      if (totalPaid >= subscriptionPrice) {
        // Fully paid
        newSubscriptionStatus = 'active';
        console.log('✅ Subscription is now fully paid');
      } else if (totalPaid > 0) {
        // Partially paid
        newSubscriptionStatus = 'active'; // Or you can create a 'partially_paid' status
        console.log('⚠️ Subscription is partially paid:', `${totalPaid}/${subscriptionPrice}`);
      }

      // Step 6: Update subscription status if needed (optional based on business logic)
      // You can uncomment this if you want to automatically update subscription status
      /*
      if (newSubscriptionStatus !== subscriptionData.status) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ status: newSubscriptionStatus })
          .eq('id', payment.subscription_id);

        if (updateError) {
          console.error('Error updating subscription status:', updateError);
        } else {
          console.log('✅ Subscription status updated to:', newSubscriptionStatus);
        }
      }
      */

      toast.success(`Payment of ${payment.amount} ${payment.currency} accepted successfully!`);

      // Close dialog and refresh
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('❌ Error accepting payment:', error);
      toast.error('Failed to accept payment: ' + error.message);
    } finally {
      setProcessing(false);
      setAction(null);
    }
  };

  const handleDeclinePayment = async () => {
    if (!payment) return;

    try {
      setProcessing(true);
      setAction('decline');

      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const currentUserId = user?.user_id || user?.id || user?.userId;

      console.log('❌ DECLINING PAYMENT:', payment.id);

      // Update payment status to declined
      await databaseService.update('student_payments', payment.id, {
        payment_status: 'declined',
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUserId,
        admin_notes: adminNotes || 'Payment declined by admin',
        updated_at: new Date().toISOString()
      });

      console.log('✅ Payment status updated to declined');

      toast.success('Payment declined. Student will be notified.');

      // Close dialog and refresh
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('❌ Error declining payment:', error);
      toast.error('Failed to decline payment: ' + error.message);
    } finally {
      setProcessing(false);
      setAction(null);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Review Payment Submission
          </DialogTitle>
          <DialogDescription>
            Review and approve or decline the student's payment submission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge
              variant={
                payment.payment_status === 'accepted' ? 'default' :
                payment.payment_status === 'declined' ? 'destructive' :
                'secondary'
              }
            >
              {payment.payment_status === 'pending_verification' ? 'Pending Review' :
               payment.payment_status === 'accepted' ? 'Accepted' : 'Declined'}
            </Badge>
          </div>

          {/* Student Info */}
          {studentInfo && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {studentInfo.firstName || studentInfo.first_name} {studentInfo.lastName || studentInfo.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {studentInfo.email}
                </p>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-bold">{payment.amount} {payment.currency}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Submitted At</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(payment.submitted_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            </div>

            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <p className="text-sm font-medium">{payment.payment_account_name}</p>
            </div>
          </div>

          {/* Subscription Info */}
          {subscriptionInfo && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Label className="text-xs font-medium text-blue-900 dark:text-blue-300">Subscription Details</Label>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-400">Subject:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-200">{subscriptionInfo.subject || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-400">Total Price:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-200">
                    {subscriptionInfo.price} {payment.currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Student Notes */}
          {payment.notes && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Student Notes
              </Label>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {payment.notes}
              </div>
            </div>
          )}

          {/* Payment Screenshot */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              Payment Screenshot
            </Label>
            <div className="border rounded-lg p-2 bg-muted/50">
              <img
                src={payment.screenshot_url}
                alt="Payment proof"
                className="w-full h-auto max-h-96 object-contain rounded"
              />
            </div>
            <a
              href={payment.screenshot_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Open in new tab
            </a>
          </div>

          {/* Admin Notes */}
          {payment.payment_status === 'pending_verification' && (
            <div className="space-y-2">
              <Label htmlFor="adminNotes" className="text-sm font-medium">
                Admin Notes (Optional)
              </Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this payment review..."
                rows={3}
              />
            </div>
          )}

          {/* Already Reviewed Info */}
          {payment.payment_status !== 'pending_verification' && payment.admin_notes && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Admin Review Notes
              </Label>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {payment.admin_notes}
              </div>
              {payment.reviewed_at && (
                <p className="text-xs text-muted-foreground">
                  Reviewed on {format(new Date(payment.reviewed_at), 'MMM dd, yyyy HH:mm')}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {payment.payment_status === 'pending_verification' ? (
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeclinePayment}
                disabled={processing}
              >
                {processing && action === 'decline' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Declining...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Decline Payment
                  </>
                )}
              </Button>
              <Button
                onClick={handleAcceptPayment}
                disabled={processing}
              >
                {processing && action === 'accept' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept Payment
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

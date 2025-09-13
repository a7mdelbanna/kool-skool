import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  DollarSign, 
  Calendar,
  User,
  FileImage,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { databaseService } from '@/services/firebase/database.service';
import { format } from 'date-fns';

interface PaymentRecord {
  id: string;
  student_id: string;
  studentName?: string;
  subscription_id: string;
  amount: number;
  currency: string;
  original_amount?: number;
  original_currency?: string;
  payment_method: string;
  payment_status: string;
  screenshot_url?: string;
  notes?: string;
  submitted_at: string;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
}

export const AdminPaymentVerification: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      
      // Fetch all student payments
      const paymentsData = await databaseService.query('student_payments', {
        orderBy: [{ field: 'submitted_at', direction: 'desc' }]
      });
      
      // Fetch student names for display
      const enrichedPayments = await Promise.all(
        paymentsData.map(async (payment: any) => {
          try {
            const student = await databaseService.getById('students', payment.student_id);
            return {
              ...payment,
              studentName: student ? `${student.first_name || student.firstName || ''} ${student.last_name || student.lastName || ''}`.trim() : 'Unknown Student'
            };
          } catch {
            return {
              ...payment,
              studentName: 'Unknown Student'
            };
          }
        })
      );
      
      setPayments(enrichedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayment = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setVerificationDialogOpen(true);
    setRejectionReason('');
  };

  const handleApprovePayment = async () => {
    if (!selectedPayment) return;
    
    try {
      setProcessing(true);
      
      // Get current user info from localStorage
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;
      
      // Update payment status to approved
      await databaseService.update('student_payments', selectedPayment.id, {
        payment_status: 'approved',
        verified_at: new Date().toISOString(),
        verified_by: currentUser?.id || 'admin'
      });
      
      // Update subscription payment status
      await databaseService.update('subscriptions', selectedPayment.subscription_id, {
        payment_status: 'paid',
        last_payment_date: new Date().toISOString()
      });
      
      toast.success('Payment approved successfully!');
      setVerificationDialogOpen(false);
      fetchPendingPayments();
    } catch (error: any) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    try {
      setProcessing(true);
      
      // Get current user info from localStorage
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;
      
      // Update payment status to rejected
      await databaseService.update('student_payments', selectedPayment.id, {
        payment_status: 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: currentUser?.id || 'admin',
        rejection_reason: rejectionReason
      });
      
      toast.success('Payment rejected');
      setVerificationDialogOpen(false);
      fetchPendingPayments();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return (
          <Badge variant="outline" className="bg-yellow-50">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment Verification</CardTitle>
          <CardDescription>
            Review and verify student payment submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments to verify
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {payment.studentName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {payment.amount} {payment.currency}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.payment_method === 'manual' ? (
                          <>
                            <FileImage className="h-3 w-3 mr-1" />
                            Manual
                          </>
                        ) : (
                          payment.payment_method
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(payment.submitted_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewPayment(payment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Payment Verification</DialogTitle>
            <DialogDescription>
              Review the payment details and screenshot
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Student</p>
                  <p className="text-sm">{selectedPayment.studentName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-sm font-semibold">
                    {selectedPayment.amount} {selectedPayment.currency}
                  </p>
                  {selectedPayment.original_currency && selectedPayment.original_currency !== selectedPayment.currency && (
                    <p className="text-xs text-muted-foreground">
                      Original: {selectedPayment.original_amount} {selectedPayment.original_currency}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Method</p>
                  <p className="text-sm">{selectedPayment.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                  <p className="text-sm">
                    {format(new Date(selectedPayment.submitted_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              
              {/* Payment Notes */}
              {selectedPayment.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    Student Notes
                  </p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedPayment.notes}</p>
                </div>
              )}
              
              {/* Payment Screenshot */}
              {selectedPayment.screenshot_url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    <FileImage className="h-4 w-4 inline mr-1" />
                    Payment Screenshot
                  </p>
                  <div className="border rounded-lg p-2">
                    <img
                      src={selectedPayment.screenshot_url}
                      alt="Payment screenshot"
                      className="w-full h-auto max-h-[400px] object-contain rounded cursor-pointer"
                      onClick={() => window.open(selectedPayment.screenshot_url, '_blank')}
                    />
                    <p className="text-xs text-center mt-2 text-muted-foreground">
                      Click image to view full size
                    </p>
                  </div>
                </div>
              )}
              
              {/* Rejection Reason (if rejecting) */}
              {selectedPayment.payment_status === 'pending_verification' && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Rejection Reason (if rejecting)
                  </p>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    rows={3}
                  />
                </div>
              )}
              
              {/* Previous Rejection Reason (if rejected) */}
              {selectedPayment.rejection_reason && (
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-sm font-medium text-red-700 mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-red-600">{selectedPayment.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerificationDialogOpen(false)}>
              Close
            </Button>
            {selectedPayment?.payment_status === 'pending_verification' && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleRejectPayment}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  variant="default"
                  onClick={handleApprovePayment}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  FileText,
  Download,
  Eye,
  MoreVertical,
  User,
  Calendar,
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { paymentMethodsService } from '@/services/paymentMethods.service';
import { studentsService } from '@/services/firebase/students.service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Payment,
  PaymentStatus,
  PaymentMethodType
} from '@/types/payment.types';

interface PaymentConfirmationDashboardProps {
  schoolId: string;
  userId: string;
  userRole: string;
}

interface PaymentWithStudent extends Payment {
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
}

const PaymentConfirmationDashboard: React.FC<PaymentConfirmationDashboardProps> = ({
  schoolId,
  userId,
  userRole
}) => {
  const [payments, setPayments] = useState<PaymentWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithStudent | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processing'>('pending');

  useEffect(() => {
    loadPendingPayments();
  }, [schoolId]);

  const loadPendingPayments = async () => {
    try {
      setLoading(true);
      const pendingPayments = await paymentMethodsService.getPendingPayments(schoolId);
      
      // Fetch student details for each payment
      const paymentsWithStudents = await Promise.all(
        pendingPayments.map(async (payment) => {
          try {
            const student = await studentsService.getById(payment.studentId);
            return {
              ...payment,
              studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
              studentEmail: student?.email,
              studentPhone: student?.phone
            };
          } catch (error) {
            console.error('Error fetching student for payment:', error);
            return {
              ...payment,
              studentName: 'Unknown Student'
            };
          }
        })
      );

      setPayments(paymentsWithStudents);
    } catch (error) {
      console.error('Error loading pending payments:', error);
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirmDialog = (payment: PaymentWithStudent, action: 'approve' | 'reject') => {
    setSelectedPayment(payment);
    setConfirmationAction(action);
    setConfirmationNotes('');
    setShowConfirmDialog(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment || !confirmationAction) return;

    setProcessing(true);
    try {
      await paymentMethodsService.confirmManualPayment(selectedPayment.id!, {
        confirmedBy: userId,
        confirmedAt: new Date(),
        status: confirmationAction === 'approve' ? 'approved' : 'rejected',
        notes: confirmationNotes,
        rejectionReason: confirmationAction === 'reject' ? confirmationNotes : undefined
      });

      toast.success(`Payment ${confirmationAction === 'approve' ? 'approved' : 'rejected'} successfully`);
      
      // Send notification to student
      // TODO: Implement notification sending
      
      await loadPendingPayments();
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error(`Failed to ${confirmationAction} payment`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PENDING:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case PaymentStatus.PROCESSING:
        return <Badge variant="default"><RefreshCw className="h-3 w-3 mr-1" />Processing</Badge>;
      case PaymentStatus.PAID:
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case PaymentStatus.FAILED:
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                          (filterStatus === 'pending' && payment.status === PaymentStatus.PENDING) ||
                          (filterStatus === 'processing' && payment.status === PaymentStatus.PROCESSING);
    
    return matchesSearch && matchesFilter;
  });

  const pendingCount = payments.filter(p => p.status === PaymentStatus.PENDING).length;
  const processingCount = payments.filter(p => p.status === PaymentStatus.PROCESSING).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Processing</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Being reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${filteredPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending confirmation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Confirmations</CardTitle>
              <CardDescription>
                Review and confirm manual payments submitted by students
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPendingPayments}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Tabs value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="processing">
                  Processing ({processingCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Payments Table */}
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No payments match your filters' 
                  : 'No pending payments to review'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{payment.studentName}</div>
                            <div className="text-xs text-muted-foreground">
                              {payment.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">${payment.amount.toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {payment.paymentMethodName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {payment.dueDate ? format(payment.dueDate, 'MMM dd, yyyy') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {payment.createdAt ? format(payment.createdAt, 'MMM dd, HH:mm') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {payment.proofUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(payment.proofUrl, '_blank')}
                              title="View proof"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleOpenConfirmDialog(payment, 'approve')}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve Payment
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenConfirmDialog(payment, 'reject')}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject Payment
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  // TODO: View payment details
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmationAction === 'approve' ? 'Approve Payment' : 'Reject Payment'}
            </DialogTitle>
            <DialogDescription>
              {confirmationAction === 'approve' 
                ? 'Confirm that this payment has been received successfully.'
                : 'Provide a reason for rejecting this payment.'}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student</span>
                  <span className="text-sm font-medium">{selectedPayment.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm font-medium">${selectedPayment.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Method</span>
                  <span className="text-sm font-medium">{selectedPayment.paymentMethodName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Description</span>
                  <span className="text-sm font-medium">{selectedPayment.description}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {confirmationAction === 'approve' ? 'Notes (Optional)' : 'Rejection Reason *'}
                </Label>
                <Textarea
                  placeholder={
                    confirmationAction === 'approve'
                      ? 'Add any notes about this payment...'
                      : 'Explain why this payment is being rejected...'
                  }
                  value={confirmationNotes}
                  onChange={(e) => setConfirmationNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {confirmationAction === 'approve' && (
                <div className="rounded-lg bg-green-50 p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-900">
                      <p className="font-medium">This action will:</p>
                      <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                        <li>Mark the payment as confirmed</li>
                        <li>Update the student's payment record</li>
                        <li>Send a confirmation notification to the student</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {confirmationAction === 'reject' && (
                <div className="rounded-lg bg-red-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-900">
                      <p className="font-medium">This action will:</p>
                      <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                        <li>Mark the payment as rejected</li>
                        <li>Notify the student to resubmit payment</li>
                        <li>Keep the payment as outstanding</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant={confirmationAction === 'approve' ? 'default' : 'destructive'}
              onClick={handleConfirmPayment}
              disabled={
                processing || 
                (confirmationAction === 'reject' && !confirmationNotes)
              }
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {confirmationAction === 'approve' ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  {confirmationAction === 'approve' ? 'Approve' : 'Reject'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentConfirmationDashboard;
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  CreditCard,
  DollarSign,
  Calendar,
  Info,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Banknote,
  Send
} from 'lucide-react';
import { paymentMethodsService } from '@/services/paymentMethods.service';
import { PaymentMethod, PaymentMethodType, PaymentStatus, Payment } from '@/types/payment.types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { uploadService } from '@/services/upload.service';

interface StudentPaymentSubmissionProps {
  schoolId: string;
  studentId: string;
}

const StudentPaymentSubmission: React.FC<StudentPaymentSubmissionProps> = ({
  schoolId,
  studentId
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [schoolId, studentId]);

  useEffect(() => {
    if (selectedPaymentId && pendingPayments.length > 0) {
      const payment = pendingPayments.find(p => p.id === selectedPaymentId);
      setSelectedPayment(payment || null);
    }
  }, [selectedPaymentId, pendingPayments]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load active payment methods
      const methods = await paymentMethodsService.getActivePaymentMethods(schoolId);
      setPaymentMethods(methods);

      // Load pending payments for this student
      // For now, we'll create mock data - in production, this would fetch from Firebase
      const mockPayments: Payment[] = [
        {
          id: '1',
          schoolId,
          studentId,
          amount: 150,
          currency: 'USD',
          description: 'Monthly Tuition - December 2024',
          dueDate: new Date('2024-12-01'),
          paymentMethodId: methods[0]?.id || '',
          paymentMethodName: methods[0]?.name || 'Bank Transfer',
          paymentMethodType: PaymentMethodType.MANUAL,
          status: PaymentStatus.PENDING,
          createdAt: new Date()
        },
        {
          id: '2',
          schoolId,
          studentId,
          amount: 50,
          currency: 'USD',
          description: 'Materials Fee',
          dueDate: new Date('2024-12-15'),
          paymentMethodId: methods[0]?.id || '',
          paymentMethodName: methods[0]?.name || 'Bank Transfer',
          paymentMethodType: PaymentMethodType.MANUAL,
          status: PaymentStatus.PENDING,
          createdAt: new Date()
        }
      ];

      setPendingPayments(mockPayments);
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload an image (JPEG, PNG) or PDF file');
        return;
      }

      setProofFile(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedPayment) {
      toast.error('Please select a payment to submit');
      return;
    }

    if (!proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload proof file
      setUploading(true);
      const proofUrl = await uploadService.uploadPaymentProof(proofFile, schoolId, studentId);
      setUploading(false);

      // Update payment with proof
      await paymentMethodsService.updatePaymentStatus(
        selectedPayment.id!,
        PaymentStatus.PROCESSING,
        {
          proofUrl,
          notes: notes || undefined
        }
      );

      toast.success('Payment proof submitted successfully! Awaiting confirmation.');
      
      // Reset form
      setSelectedPaymentId('');
      setSelectedPayment(null);
      setProofFile(null);
      setNotes('');
      
      // Reload payments
      await loadData();
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('Failed to submit payment. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading payment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Payments Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${pendingPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingPayments.length} pending payment{pendingPayments.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Due Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingPayments.length > 0
                ? format(
                    new Date(
                      Math.min(...pendingPayments.map(p => p.dueDate.getTime()))
                    ),
                    'MMM dd'
                  )
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Upcoming payment deadline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentMethods.length}</div>
            <p className="text-xs text-muted-foreground">
              Available payment options
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Payment</CardTitle>
          <CardDescription>
            Upload proof of payment for manual payments or pay directly with available methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Select Payment */}
          <div className="space-y-2">
            <Label htmlFor="payment-select">Select Payment</Label>
            <Select value={selectedPaymentId} onValueChange={setSelectedPaymentId}>
              <SelectTrigger id="payment-select">
                <SelectValue placeholder="Choose a pending payment" />
              </SelectTrigger>
              <SelectContent>
                {pendingPayments.map((payment) => (
                  <SelectItem key={payment.id} value={payment.id!}>
                    <div className="flex items-center justify-between w-full">
                      <span>{payment.description}</span>
                      <span className="ml-2 font-semibold">${payment.amount}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Payment Details */}
          {selectedPayment && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Amount Due:</span>
                      <span className="font-semibold">
                        ${selectedPayment.amount} {selectedPayment.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Due Date:</span>
                      <span className="font-semibold">
                        {format(selectedPayment.dueDate, 'MMMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <span className="font-semibold">
                        {selectedPayment.paymentMethodName}
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Payment Method Instructions */}
              {selectedPayment.paymentMethodType === PaymentMethodType.MANUAL && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Payment Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {paymentMethods.find(m => m.id === selectedPayment.paymentMethodId)?.instructions && (
                        <p className="whitespace-pre-wrap">
                          {paymentMethods.find(m => m.id === selectedPayment.paymentMethodId)?.instructions}
                        </p>
                      )}
                      {paymentMethods.find(m => m.id === selectedPayment.paymentMethodId)?.accountName && (
                        <div>
                          <span className="font-medium">Account Name:</span>{' '}
                          {paymentMethods.find(m => m.id === selectedPayment.paymentMethodId)?.accountName}
                        </div>
                      )}
                      {paymentMethods.find(m => m.id === selectedPayment.paymentMethodId)?.accountNumber && (
                        <div>
                          <span className="font-medium">Account Number:</span>{' '}
                          {paymentMethods.find(m => m.id === selectedPayment.paymentMethodId)?.accountNumber}
                        </div>
                      )}
                      {paymentMethods.find(m => m.id === selectedPayment.paymentMethodId)?.bankName && (
                        <div>
                          <span className="font-medium">Bank:</span>{' '}
                          {paymentMethods.find(m => m.id === selectedPayment.paymentMethodId)?.bankName}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upload Proof */}
              {selectedPayment.paymentMethodType === PaymentMethodType.MANUAL && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="proof-upload">Upload Payment Proof</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="proof-upload"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="flex-1"
                      />
                      {proofFile && (
                        <Badge variant="secondary" className="gap-1">
                          <FileText className="h-3 w-3" />
                          {proofFile.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a screenshot, photo, or PDF of your payment receipt (max 5MB)
                    </p>
                  </div>

                  {/* Additional Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any relevant information about your payment..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitPayment}
                    disabled={!proofFile || submitting || uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-pulse" />
                        Uploading Proof...
                      </>
                    ) : submitting ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Submitting Payment...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Payment Proof
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Automatic Payment (Stripe) */}
              {selectedPayment.paymentMethodType === PaymentMethodType.STRIPE && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Stripe payment integration will be available soon. Please use manual payment methods for now.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* No Pending Payments */}
          {pendingPayments.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                You have no pending payments at this time.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>
            Your recently submitted payments awaiting confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No recent payment submissions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPaymentSubmission;
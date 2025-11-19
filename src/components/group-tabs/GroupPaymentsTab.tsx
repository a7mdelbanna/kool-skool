import React, { useState, useContext } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { UserContext } from '@/App';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, User, Loader2, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';

interface GroupStudent {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  status: string;
  start_date: string;
}

interface GroupPaymentsTabProps {
  groupId: string;
  groupStudents: GroupStudent[];
}

const GroupPaymentsTab: React.FC<GroupPaymentsTabProps> = ({
  groupId,
  groupStudents
}) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedStudentSubscriptions, setSelectedStudentSubscriptions] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    currency: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    subscription_id: '',
    method: 'Cash',
    notes: ''
  });

  // Fetch payment data for all students in this group
  const { data: studentPayments, isLoading } = useQuery({
    queryKey: ['group-student-payments', groupId],
    queryFn: async () => {
      if (!groupStudents || groupStudents.length === 0) return [];

      const payments = await Promise.all(
        groupStudents.map(async (student) => {
          try {
            // Get subscriptions for this student in this group FIRST
            const { data: subscriptions } = await supabase.rpc('get_student_subscriptions', {
              p_student_id: student.student_id
            });

            // Filter to only group subscriptions - check both snake_case and camelCase field names
            const groupSubscriptions = (subscriptions || []).filter(
              (sub: any) => {
                const subGroupId = sub.group_id || sub.groupId;
                return subGroupId === groupId;
              }
            );

            // If no group subscriptions, return early
            if (groupSubscriptions.length === 0) {
              return {
                studentId: student.student_id,
                studentName: student.student_name,
                transactions: [],
                totalOwed: 0,
                totalPaid: 0,
                outstanding: 0,
                paymentStatus: 'pending',
                currency: 'USD'
              };
            }

            // Get currency from first subscription
            const currency = groupSubscriptions[0]?.currency || 'USD';

            // Calculate total owed from group subscriptions
            const totalOwed = groupSubscriptions.reduce(
              (sum: number, sub: any) => sum + (parseFloat(sub.total_price) || 0),
              0
            );

            // Get subscription IDs for filtering transactions
            const subscriptionIds = groupSubscriptions.map((sub: any) => sub.id);

            // Get transactions ONLY for these specific subscriptions and matching currency
            const allTransactions = await databaseService.query('transactions', {
              where: [
                { field: 'student_id', operator: '==', value: student.student_id },
                { field: 'type', operator: '==', value: 'income' }
              ]
            });

            // Filter transactions to only those for this group's subscriptions AND matching currency
            const transactions = allTransactions.filter((t: any) => {
              const transactionSubId = t.subscription_id || t.subscriptionId;
              const transactionCurrency = t.currency;

              // Must match subscription AND currency
              return subscriptionIds.includes(transactionSubId) && transactionCurrency === currency;
            });

            // Calculate total paid (now only from filtered transactions)
            const totalPaid = transactions.reduce(
              (sum: number, t: any) => sum + (parseFloat(t.amount) || 0),
              0
            );

            // Determine payment status
            let paymentStatus = 'pending';
            if (totalPaid >= totalOwed && totalOwed > 0) {
              paymentStatus = 'paid';
            } else if (totalPaid > 0) {
              paymentStatus = 'partial';
            }

            return {
              studentId: student.student_id,
              studentName: student.student_name,
              transactions,
              totalOwed,
              totalPaid,
              outstanding: totalOwed - totalPaid,
              paymentStatus,
              currency
            };
          } catch (error) {
            console.error(`Error fetching payments for ${student.student_name}:`, error);
            return {
              studentId: student.student_id,
              studentName: student.student_name,
              transactions: [],
              totalOwed: 0,
              totalPaid: 0,
              outstanding: 0,
              paymentStatus: 'pending',
              currency: 'USD'
            };
          }
        })
      );

      return payments;
    },
    enabled: !!groupId && !!groupStudents && groupStudents.length > 0
  });

  // Fetch accounts for payment creation
  const { data: accounts } = useQuery({
    queryKey: ['school-accounts', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];
      const data = await databaseService.query('accounts', {
        where: [
          { field: 'school_id', operator: '==', value: user.schoolId },
          { field: 'is_active', operator: '==', value: true }
        ]
      });
      return (data || []).filter((account: any) => !account.is_archived);
    },
    enabled: !!user?.schoolId && paymentDialogOpen
  });

  // Payment creation mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return await databaseService.create('transactions', paymentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-student-payments', groupId] });
      queryClient.invalidateQueries({ queryKey: ['school-transactions', user?.schoolId] });
      toast({
        title: "Success",
        description: "Payment created successfully",
      });
      setPaymentDialogOpen(false);
      resetPaymentForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    }
  });

  // Handler to open payment dialog for a student
  const handleAddPayment = async (student: any) => {
    setSelectedStudent(student);

    // Fetch student's group subscriptions
    const { data: subscriptions } = await supabase.rpc('get_student_subscriptions', {
      p_student_id: student.studentId
    });

    const groupSubs = (subscriptions || []).filter((sub: any) => {
      const subGroupId = sub.group_id || sub.groupId;
      return subGroupId === groupId;
    });

    setSelectedStudentSubscriptions(groupSubs);

    // Pre-fill currency from student's subscription
    if (groupSubs.length > 0) {
      setPaymentForm(prev => ({
        ...prev,
        currency: groupSubs[0].currency || student.currency,
        subscription_id: groupSubs[0].id
      }));
    }

    setPaymentDialogOpen(true);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      currency: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      account_id: '',
      subscription_id: '',
      method: 'Cash',
      notes: ''
    });
    setSelectedStudent(null);
    setSelectedStudentSubscriptions([]);
  };

  const handleSubmitPayment = () => {
    if (!selectedStudent || !user?.schoolId) return;

    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (!paymentForm.subscription_id) {
      toast({
        title: "Validation Error",
        description: "Please select a subscription",
        variant: "destructive",
      });
      return;
    }

    if (!paymentForm.account_id) {
      toast({
        title: "Validation Error",
        description: "Please select an account",
        variant: "destructive",
      });
      return;
    }

    createPaymentMutation.mutate({
      school_id: user.schoolId,
      student_id: selectedStudent.studentId,
      subscription_id: paymentForm.subscription_id,
      group_id: groupId,
      type: 'income',
      amount: amount,
      currency: paymentForm.currency,
      transaction_date: paymentForm.date,
      payment_method: paymentForm.method,
      from_account_id: paymentForm.account_id,
      description: `Payment for group subscription`,
      notes: paymentForm.notes || '',
      status: 'completed',
      created_at: new Date().toISOString()
    });
  };

  // Calculate group totals
  const groupTotals = React.useMemo(() => {
    if (!studentPayments) return { totalOwed: 0, totalPaid: 0, outstanding: 0 };

    return studentPayments.reduce(
      (acc, student) => ({
        totalOwed: acc.totalOwed + student.totalOwed,
        totalPaid: acc.totalPaid + student.totalPaid,
        outstanding: acc.outstanding + student.outstanding
      }),
      { totalOwed: 0, totalPaid: 0, outstanding: 0 }
    );
  }, [studentPayments]);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'partial':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'pending':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!studentPayments || studentPayments.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Students</h3>
        <p className="text-muted-foreground">
          Add students to this group to track their payments
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Expected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {groupTotals.totalOwed.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {groupTotals.totalPaid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {groupTotals.totalOwed > 0
                ? `${Math.round((groupTotals.totalPaid / groupTotals.totalOwed) * 100)}% collected`
                : 'No payments expected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${groupTotals.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
              {groupTotals.outstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {groupTotals.outstanding > 0 ? 'Pending collection' : 'All paid'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Student Payment Details */}
      {studentPayments.map((student) => (
        <Card key={student.studentId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {student.studentName}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getPaymentStatusColor(student.paymentStatus)}>
                  {student.paymentStatus}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddPayment(student)}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Payment
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Expected</div>
                <div className="text-lg font-semibold">{student.totalOwed.toFixed(2)} {student.currency}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Received</div>
                <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {student.totalPaid.toFixed(2)} {student.currency}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Outstanding</div>
                <div className={`text-lg font-semibold ${student.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                  {student.outstanding.toFixed(2)} {student.currency}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {student.totalOwed > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Payment Progress</span>
                  <span className="font-medium">
                    {Math.round((student.totalPaid / student.totalOwed) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(student.totalPaid / student.totalOwed) * 100}
                  className="h-2"
                />
              </div>
            )}

            {/* Recent Payments */}
            {student.transactions.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Minus className="h-4 w-4" />
                  Recent Payments
                </h4>
                <div className="space-y-2">
                  {student.transactions
                    .sort((a: any, b: any) =>
                      new Date(b.transaction_date || b.transactionDate).getTime() -
                      new Date(a.transaction_date || a.transactionDate).getTime()
                    )
                    .slice(0, 3)
                    .map((payment: any) => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-muted-foreground">
                          {formatDate(payment.transaction_date || payment.transactionDate)}
                        </span>
                        <span className="font-medium">{payment.amount} {payment.currency || student.currency}</span>
                      </div>
                    ))}
                </div>
                {student.transactions.length > 3 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    + {student.transactions.length - 3} more payment{student.transactions.length - 3 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No payments recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment for {selectedStudent?.studentName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Subscription Selection */}
            <div>
              <Label htmlFor="subscription">Subscription</Label>
              <Select
                value={paymentForm.subscription_id}
                onValueChange={(value) => {
                  const selectedSub = selectedStudentSubscriptions.find(s => s.id === value);
                  setPaymentForm(prev => ({
                    ...prev,
                    subscription_id: value,
                    currency: selectedSub?.currency || prev.currency
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subscription" />
                </SelectTrigger>
                <SelectContent>
                  {selectedStudentSubscriptions.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.session_count} sessions - {sub.total_price} {sub.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount ({paymentForm.currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date">Payment Date</Label>
              <Input
                id="date"
                type="date"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label htmlFor="method">Payment Method</Label>
              <Select
                value={paymentForm.method}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Selection */}
            <div>
              <Label htmlFor="account">Account ({paymentForm.currency})</Label>
              <Select
                value={paymentForm.account_id}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, account_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    ?.filter((account: any) => account.currency_code === paymentForm.currency)
                    .map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPayment}
              disabled={createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupPaymentsTab;

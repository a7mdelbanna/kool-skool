
import React, { useState } from 'react';
import { Plus, Search, Filter, Download, MoreHorizontal, Edit, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PaymentDialog from '@/components/PaymentDialog';
import PaymentTagSelector from '@/components/PaymentTagSelector';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface PaymentRecord {
  id: string;
  student_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  status: string;
  notes: string;
  created_at: string;
  student_name?: string;
}

const PaymentsPage = () => {
  const queryClient = useQueryClient();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(undefined);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [searchTerm, setSearchTerm] = useState('');

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const schoolId = getSchoolId();

  // Fetch all student payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['all-student-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) {
        console.log('No school ID available for payments');
        return [];
      }
      
      // First get all students in the school
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          users!inner(first_name, last_name)
        `)
        .eq('school_id', schoolId);

      if (studentsError) throw studentsError;

      // Then get all payments for these students
      const studentIds = students?.map(s => s.id) || [];
      if (studentIds.length === 0) return [];

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('student_payments')
        .select('*')
        .in('student_id', studentIds)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Combine payment data with student names
      const combinedPayments = paymentsData?.map(payment => {
        const student = students?.find(s => s.id === payment.student_id);
        return {
          ...payment,
          student_name: student?.users ? 
            `${(student.users as any).first_name} ${(student.users as any).last_name}` : 
            'Unknown Student'
        };
      }) || [];

      console.log('📊 Student payments fetched:', combinedPayments.length, combinedPayments);
      return combinedPayments;
    },
    enabled: !!schoolId,
  });

  // Fetch all transactions from the new transactions table
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['school-transactions', schoolId],
    queryFn: async () => {
      if (!schoolId) {
        console.log('No school ID available for transactions');
        return [];
      }
      
      const { data, error } = await supabase
        .rpc('get_school_transactions', { p_school_id: schoolId });

      if (error) {
        console.error('❌ Error fetching transactions:', error);
        throw error;
      }
      
      console.log('📊 School transactions fetched:', data?.length || 0, data);
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Fetch tags for display
  const { data: tags = [] } = useQuery({
    queryKey: ['school-tags', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase.rpc('get_school_tags', {
        p_school_id: schoolId
      });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Calculate statistics from actual payment data
  const paidPayments = payments.filter(payment => payment.status === 'completed');
  const pendingPayments = payments.filter(payment => payment.status === 'pending');
  
  const totalRevenue = paidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  
  // Add transaction stats
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const totalTransactionIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const netIncome = (totalRevenue + totalTransactionIncome) - totalExpenses;

  // Combine payments and transactions for display
  const allTransactions = [
    ...payments.map(p => ({
      id: p.id,
      type: 'student_payment',
      student_name: p.student_name,
      amount: p.amount,
      currency: p.currency,
      date: p.payment_date,
      method: p.payment_method,
      status: p.status,
      notes: p.notes,
      created_at: p.created_at,
      category_name: undefined as string | undefined,
      tags: undefined as any
    })),
    ...transactions.map(t => ({
      id: t.id,
      type: t.type,
      student_name: t.contact_name,
      amount: t.amount,
      currency: t.currency,
      date: t.transaction_date,
      method: t.payment_method,
      status: t.status,
      notes: t.notes,
      created_at: t.created_at,
      category_name: t.category_name || undefined,
      tags: t.tags
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Add debug logging
  console.log('🔍 Debug - Payments count:', payments.length);
  console.log('🔍 Debug - Transactions count:', transactions.length);
  console.log('🔍 Debug - All transactions combined:', allTransactions.length);
  console.log('🔍 Debug - All transactions data:', allTransactions);

  // Filter transactions based on search term
  const filteredTransactions = allTransactions.filter(transaction =>
    transaction.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('🔍 Debug - Filtered transactions:', filteredTransactions.length);

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('student_payments')
        .delete()
        .eq('id', paymentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-student-payments'] });
      toast.success('Payment deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete payment: ' + error.message);
    },
  });

  const handleAddPayment = () => {
    setSelectedPayment(undefined);
    setDialogMode('add');
    setPaymentDialogOpen(true);
  };

  const handleAddTransaction = () => {
    setAddTransactionDialogOpen(true);
  };

  const handleEditPayment = (payment: PaymentRecord) => {
    setSelectedPayment({
      id: payment.id,
      amount: payment.amount,
      date: new Date(payment.payment_date),
      method: payment.payment_method,
      notes: payment.notes || '',
      status: payment.status,
      studentName: payment.student_name,
      student_id: payment.student_id
    });
    setDialogMode('edit');
    setPaymentDialogOpen(true);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      deletePaymentMutation.mutate(paymentId);
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Type', 'Contact/Student', 'Amount', 'Method', 'Status', 'Category', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(transaction => [
        transaction.date,
        transaction.type,
        `"${transaction.student_name || ''}"`,
        transaction.amount,
        transaction.method || '',
        transaction.status,
        transaction.category_name || '',
        `"${transaction.notes || ''}"`
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Transactions exported successfully');
  };

  const handleTransactionSuccess = () => {
    // Invalidate both queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ['school-transactions', schoolId] });
    queryClient.invalidateQueries({ queryKey: ['all-student-payments', schoolId] });
    console.log('🔄 Invalidating queries after transaction success');
    toast.success('Transaction created successfully');
  };

  const handlePaymentSuccess = () => {
    // Invalidate both queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ['school-transactions', schoolId] });
    queryClient.invalidateQueries({ queryKey: ['all-student-payments', schoolId] });
    console.log('🔄 Invalidating queries after payment success');
  };

  if (!schoolId) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-muted-foreground">Track and manage your payment history</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-amber-600 text-lg">No school ID found</p>
          <p className="text-muted-foreground">Please refresh the page and try again.</p>
        </div>
      </div>
    );
  }

  if (paymentsLoading || transactionsLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-muted-foreground">Track and manage your payment history</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track and manage your payment history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handleAddTransaction}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
          <Button onClick={handleAddPayment}>
            <Plus className="h-4 w-4 mr-2" />
            Record New
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Net Income</CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${netIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Revenue minus expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalRevenue + totalTransactionIncome).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From all payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total Expenses</CardTitle>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All business expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Pending/Overdue</CardTitle>
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">${pendingAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Payments not yet received</p>
          </CardContent>
        </Card>
      </div>

      {/* Tags Display Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              Available Tags
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings?tab=tags">
                <Settings className="h-4 w-4 mr-2" />
                Manage Tags
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: any) => (
              <Badge
                key={tag.id}
                variant="outline"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: tag.color }} />
                {tag.name}
                {tag.usage_count > 0 && (
                  <span className="ml-1 text-xs opacity-70">({tag.usage_count})</span>
                )}
              </Badge>
            ))}
            {tags.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No tags created yet. 
                <Link to="/settings?tab=tags" className="text-primary hover:underline ml-1">
                  Create your first tag in Settings
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                All Transactions ({filteredTransactions.length})
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Contact/Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={`${transaction.type}-${transaction.id}`}>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={
                        transaction.type === 'income' || transaction.type === 'student_payment'
                          ? 'border-green-200 text-green-700' 
                          : transaction.type === 'expense'
                          ? 'border-red-200 text-red-700'
                          : 'border-blue-200 text-blue-700'
                      }
                    >
                      {transaction.type === 'student_payment' ? 'Payment' : transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {transaction.student_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </div>
                      <span>{transaction.student_name || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                      className={transaction.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {transaction.status === 'completed' ? 'Completed' : transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>${Number(transaction.amount).toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{transaction.method || '-'}</TableCell>
                  <TableCell>{transaction.category_name || '-'}</TableCell>
                  <TableCell>
                    {transaction.type === 'student_payment' ? (
                      <PaymentTagSelector paymentId={transaction.id} />
                    ) : (
                      <div className="flex gap-1">
                        {transaction.tags && Array.isArray(transaction.tags) && transaction.tags.map((tag: any) => (
                          <Badge key={tag.id} variant="outline" className="text-xs">
                            <div 
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{transaction.notes || '-'}</TableCell>
                  <TableCell>
                    {transaction.type === 'student_payment' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEditPayment(transaction as any)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeletePayment(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        payment={selectedPayment}
        mode={dialogMode}
        onSuccess={handlePaymentSuccess}
      />

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={addTransactionDialogOpen}
        onOpenChange={setAddTransactionDialogOpen}
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
};

export default PaymentsPage;

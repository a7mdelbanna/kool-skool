import React, { useState } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Download,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  User,
  PlusCircle,
  Pencil,
  Trash2,
  ReceiptIcon,
  Wallet,
  Repeat,
  Banknote,
  CircleDollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUserInfo, getStudentsWithDetails, getStudentPayments, getSchoolTransactions } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PaymentDialog from '@/components/PaymentDialog';
import ExpenseDialog from '@/components/ExpenseDialog';
import { Expense } from '@/contexts/PaymentContext';
import PaymentTagSelector from '@/components/PaymentTagSelector';
import TagManager from '@/components/TagManager';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import { createTransaction } from '@/integrations/supabase/client';

interface StudentPayment {
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

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  transaction_date: string;
  description: string;
  notes: string;
  status: string;
  contact_name: string;
  contact_type: string;
  category_name: string;
  category_full_path: string;
  from_account_name: string;
  to_account_name: string;
  payment_method: string;
  receipt_number: string;
  receipt_url: string;
  tax_amount: number;
  tax_rate: number;
  is_recurring: boolean;
  recurring_frequency: string;
  created_at: string;
  tags: any[];
}

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('transactions');
  const [sortColumn, setSortColumn] = useState('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Dialog states
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(undefined);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');

  const queryClient = useQueryClient();

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  // Fetch school transactions (new unified data)
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['school-transactions', userInfo?.[0]?.user_school_id],
    queryFn: () => getSchoolTransactions(userInfo?.[0]?.user_school_id as string),
    enabled: !!userInfo?.[0]?.user_school_id,
  });

  // Fetch students to get student payments (keep for backward compatibility)
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-with-details', userInfo?.[0]?.user_school_id],
    queryFn: () => getStudentsWithDetails(userInfo?.[0]?.user_school_id as string),
    enabled: !!userInfo?.[0]?.user_school_id,
  });

  // Fetch all student payments using the proper Supabase client function (keep for backward compatibility)
  const { data: allPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['all-student-payments', students],
    queryFn: async () => {
      if (!students.length) return [];
      
      console.log('🔄 Fetching payments for', students.length, 'students');
      const payments: StudentPayment[] = [];
      
      for (const student of students) {
        try {
          console.log('📝 Fetching payments for student:', student.id, student.first_name, student.last_name);
          
          const studentPayments = await getStudentPayments(student.id);
          
          console.log('💰 Found', studentPayments.length, 'payments for', student.first_name, student.last_name);
          
          const paymentsWithStudentName = studentPayments.map((payment: any) => ({
            ...payment,
            student_name: `${student.first_name} ${student.last_name}`
          }));
          
          payments.push(...paymentsWithStudentName);
        } catch (error) {
          console.error(`❌ Error fetching payments for student ${student.id}:`, error);
        }
      }
      
      console.log('✅ Total payments fetched:', payments.length);
      return payments;
    },
    enabled: students.length > 0,
  });

  // Mock expenses data (you can replace this with real data later)
  const expenses: Expense[] = [];
  
  const isLoading = studentsLoading || paymentsLoading || transactionsLoading;
  
  console.log('📊 Payments data:', { 
    transactions: transactions.length,
    allPayments: allPayments.length, 
    isLoading, 
    studentsCount: students.length 
  });
  
  // Calculate totals for payments (combine old payments and new transactions)
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const allIncomePayments = [...allPayments.filter(p => p.status === 'completed'), ...incomeTransactions];
  const allExpensePayments = [...expenses, ...expenseTransactions];
  
  const totalPaid = allIncomePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalPending = allPayments
    .filter(payment => payment.status === 'pending')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalOverdue = allPayments
    .filter(payment => payment.status === 'failed')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalPayments = totalPaid;
  
  // Calculate total for expenses (combine old expenses and new expense transactions)
  const totalExpenses = allExpensePayments.reduce((sum, expense) => sum + Number(expense.amount), 0);
  
  // Calculate net income (revenue - expenses)
  const netIncome = totalPayments - totalExpenses;
  
  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Open payment dialog for adding
  const handleAddPayment = () => {
    setSelectedPayment(undefined);
    setDialogMode('add');
    setPaymentDialogOpen(true);
  };
  
  // Open payment dialog for editing
  const handleEditPayment = (payment: StudentPayment) => {
    setSelectedPayment(payment);
    setDialogMode('edit');
    setPaymentDialogOpen(true);
  };
  
  // Delete payment with confirmation
  const handleDeletePayment = (payment: StudentPayment) => {
    toast.success(`Payment of $${payment.amount} would be deleted`);
  };
  
  // Open expense dialog for adding
  const handleAddExpense = () => {
    setSelectedExpense(undefined);
    setDialogMode('add');
    setExpenseDialogOpen(true);
  };
  
  // Open expense dialog for editing
  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setDialogMode('edit');
    setExpenseDialogOpen(true);
  };
  
  // Delete expense with confirmation
  const handleDeleteExpense = (expense: Expense) => {
    toast.success(`Expense of $${expense.amount} would be deleted`);
  };

  // Handle adding new transaction
  const handleAddTransaction = async (transactionData: any) => {
    try {
      await createTransaction({
        school_id: userInfo?.[0]?.user_school_id as string,
        ...transactionData,
      });
      queryClient.invalidateQueries({ queryKey: ['school-transactions'] });
      toast.success('Transaction created successfully');
    } catch (error: any) {
      toast.error('Failed to create transaction: ' + error.message);
    }
  };
  
  // Get status badge for payments
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>Cancelled</span>
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600';
      case 'expense': return 'text-red-600';
      case 'transfer': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };
  
  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(transaction => 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortColumn === 'transaction_date') {
        return sortDirection === 'asc' 
          ? new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
          : new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
      } else if (sortColumn === 'amount') {
        return sortDirection === 'asc' 
          ? Number(a.amount) - Number(b.amount)
          : Number(b.amount) - Number(a.amount);
      } else if (sortColumn === 'type') {
        return sortDirection === 'asc'
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      }
      return 0;
    });

  // Filter and sort payments (keep for backward compatibility)
  const filteredPayments = allPayments
    .filter(payment => 
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortColumn === 'payment_date') {
        return sortDirection === 'asc' 
          ? new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
          : new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime();
      } else if (sortColumn === 'amount') {
        return sortDirection === 'asc' 
          ? Number(a.amount) - Number(b.amount)
          : Number(b.amount) - Number(a.amount);
      } else if (sortColumn === 'student_name') {
        const nameA = a.student_name || '';
        const nameB = b.student_name || '';
        return sortDirection === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      return 0;
    });
  
  // Filter and sort expenses (empty for now)
  const filteredExpenses = expenses
    .filter(expense => 
      expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Handle tag changes to refresh the payments list
  const handleTagsChange = () => {
    queryClient.invalidateQueries({ queryKey: ['all-student-payments'] });
    queryClient.invalidateQueries({ queryKey: ['school-transactions'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">Loading transactions...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments & Transactions</h1>
          <p className="text-muted-foreground mt-1">Track and manage your financial transactions</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button 
            onClick={() => setAddTransactionDialogOpen(true)}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
        </div>
      </div>
      
      {/* Add Tag Manager */}
      <TagManager />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="transactions" className="gap-2">
              <Repeat className="h-4 w-4" />
              All Transactions ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Student Payments ({allPayments.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <ReceiptIcon className="h-4 w-4" />
              Expenses ({expenses.length})
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder={activeTab === "transactions" ? "Search transactions..." : activeTab === "payments" ? "Search payments..." : "Search expenses..."}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>
        </div>
        
        <TabsContent value="transactions" className="mt-0">
          <div className="rounded-lg border glass glass-hover overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('type')}
                      className="gap-1 font-medium"
                    >
                      Type
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('amount')}
                      className="gap-1 font-medium"
                    >
                      Amount
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('transaction_date')}
                      className="gap-1 font-medium"
                    >
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      {transactions.length === 0 ? 'No transactions found.' : 'No transactions match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "capitalize",
                            transaction.type === 'income' && "bg-green-100 text-green-800 border-green-200",
                            transaction.type === 'expense' && "bg-red-100 text-red-800 border-red-200",
                            transaction.type === 'transfer' && "bg-blue-100 text-blue-800 border-blue-200"
                          )}
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{transaction.description}</div>
                        {transaction.notes && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {transaction.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={cn("font-medium", getTransactionTypeColor(transaction.type))}>
                        {transaction.currency === 'EUR' ? '€' : transaction.currency === 'RUB' ? '₽' : '$'}{Number(transaction.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(transaction.transaction_date), 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.contact_name && (
                          <div>
                            <div className="font-medium">{transaction.contact_name}</div>
                            <div className="text-sm text-muted-foreground capitalize">{transaction.contact_type}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.category_full_path && (
                          <div className="text-sm">{transaction.category_full_path}</div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {transaction.tags?.map((tag: any) => (
                            <Badge 
                              key={tag.id} 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                backgroundColor: tag.color + '20',
                                borderColor: tag.color,
                                color: tag.color 
                              }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="payments" className="mt-0">
          <div className="rounded-lg border glass glass-hover overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('student_name')}
                      className="gap-1 font-medium"
                    >
                      Student
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('amount')}
                      className="gap-1 font-medium"
                    >
                      Amount
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('payment_date')}
                      className="gap-1 font-medium"
                    >
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {allPayments.length === 0 ? 'No payments found.' : 'No payments match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="" alt={payment.student_name || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {payment.student_name ? payment.student_name.split(' ').map(n => n[0]).join('') : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{payment.student_name || 'Unknown Student'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="font-medium">
                        {payment.currency === 'EUR' ? '€' : payment.currency === 'RUB' ? '₽' : '$'}{Number(payment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>
                        <PaymentTagSelector
                          paymentId={payment.id}
                          onTagsChange={handleTagsChange}
                        />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{payment.notes}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPayment(payment)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePayment(payment)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="expenses" className="mt-0">
          <div className="rounded-lg border glass glass-hover overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No expenses found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddTransactionDialog
        open={addTransactionDialogOpen}
        onOpenChange={setAddTransactionDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['school-transactions'] });
          setAddTransactionDialogOpen(false);
        }}
      />

      <PaymentDialog 
        open={paymentDialogOpen} 
        onOpenChange={setPaymentDialogOpen}
        payment={selectedPayment}
        mode={dialogMode}
      />

      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        expense={selectedExpense}
        mode={dialogMode}
      />
    </div>
  );
};

export default Payments;

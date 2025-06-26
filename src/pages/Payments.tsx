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
import { useQuery } from '@tanstack/react-query';
import { getCurrentUserInfo, getStudentsWithDetails, getStudentPayments } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PaymentDialog from '@/components/PaymentDialog';
import ExpenseDialog from '@/components/ExpenseDialog';
import { Expense } from '@/contexts/PaymentContext';
import PaymentTagSelector from '@/components/PaymentTagSelector';
import TagManager from '@/components/TagManager';

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

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('payments');
  const [sortColumn, setSortColumn] = useState('payment_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(undefined);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  // Fetch students to get student payments
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-with-details', userInfo?.[0]?.user_school_id],
    queryFn: () => getStudentsWithDetails(userInfo?.[0]?.user_school_id as string),
    enabled: !!userInfo?.[0]?.user_school_id,
  });

  // Fetch all student payments using the proper Supabase client function
  const { data: allPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['all-student-payments', students],
    queryFn: async () => {
      if (!students.length) return [];
      
      console.log('🔄 Fetching payments for', students.length, 'students');
      const payments: StudentPayment[] = [];
      
      for (const student of students) {
        try {
          console.log('📝 Fetching payments for student:', student.id, student.first_name, student.last_name);
          
          // Use the existing getStudentPayments function from the client
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
  
  const isLoading = studentsLoading || paymentsLoading;
  
  console.log('📊 Payments data:', { 
    allPayments: allPayments.length, 
    isLoading, 
    studentsCount: students.length 
  });
  
  // Calculate totals for payments
  const totalPaid = allPayments
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
    
  const totalPending = allPayments
    .filter(payment => payment.status === 'pending')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
    
  const totalOverdue = allPayments
    .filter(payment => payment.status === 'failed')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
    
  const totalPayments = allPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  
  // Calculate total for expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
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
    // This would need to be implemented with actual delete functionality
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
  
  // Get status badge for payments
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Paid</span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>Overdue</span>
          </Badge>
        );
      default:
        return null;
    }
  };
  
  // Filter and sort payments
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">Loading payments...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and manage your payment history</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <PlusCircle className="h-4 w-4" />
                <span>Record New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAddPayment}>
                <DollarSign className="h-4 w-4 mr-2" />
                <span>Add Payment</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddExpense}>
                <ReceiptIcon className="h-4 w-4 mr-2" />
                <span>Add Expense</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 element-transition">
        <Card className="glass glass-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-primary" />
              Net Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              netIncome >= 0 ? "text-green-600" : "text-red-600"
            )}>
              ${netIncome.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Revenue minus expenses</p>
          </CardContent>
        </Card>
        
        <Card className="glass glass-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPayments.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">From all payments</p>
          </CardContent>
        </Card>
        
        <Card className="glass glass-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All business expenses</p>
          </CardContent>
        </Card>
        
        <Card className="glass glass-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Pending/Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">${(totalPending + totalOverdue).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Payments not yet received</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Add Tag Manager */}
      <TagManager />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="payments" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Payments ({allPayments.length})
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
                placeholder={activeTab === "payments" ? "Search payments..." : "Search expenses..."}
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
                          currentTags={[]} // This will be populated when we fetch tags for each payment
                          onTagsChange={(tags) => {
                            // Handle tag changes - could invalidate queries to refresh the list
                            console.log('Tags updated for payment:', payment.id, tags);
                          }}
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

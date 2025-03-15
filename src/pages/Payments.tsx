
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
import { Payment, Expense, usePayments } from '@/contexts/PaymentContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import PaymentDialog from '@/components/PaymentDialog';
import ExpenseDialog from '@/components/ExpenseDialog';

const Payments = () => {
  const { payments, expenses, removePayment, removeExpense } = usePayments();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('payments');
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | undefined>(undefined);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  
  // Calculate totals for payments
  const calculatePaymentTotal = (status: string) => {
    return payments
      .filter(payment => payment.status === status)
      .reduce((sum, payment) => sum + payment.amount, 0);
  };
  
  const totalPaid = calculatePaymentTotal('completed');
  const totalPending = calculatePaymentTotal('pending');
  const totalOverdue = calculatePaymentTotal('failed');
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
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
  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setDialogMode('edit');
    setPaymentDialogOpen(true);
  };
  
  // Delete payment with confirmation
  const handleDeletePayment = (payment: Payment) => {
    removePayment(payment.id);
    toast({
      title: "Payment deleted",
      description: `Payment of $${payment.amount} has been removed.`,
    });
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
    removeExpense(expense.id);
    toast({
      title: "Expense deleted",
      description: `Expense of $${expense.amount} has been removed.`,
    });
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
  const filteredPayments = payments
    .filter(payment => 
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortColumn === 'date') {
        return sortDirection === 'asc' 
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortColumn === 'amount') {
        return sortDirection === 'asc' 
          ? a.amount - b.amount
          : b.amount - a.amount;
      } else if (sortColumn === 'studentName') {
        const nameA = a.studentName || '';
        const nameB = b.studentName || '';
        return sortDirection === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else if (sortColumn === 'notes') {
        return sortDirection === 'asc'
          ? a.notes.localeCompare(b.notes)
          : b.notes.localeCompare(a.notes);
      }
      return 0;
    });
  
  // Filter and sort expenses
  const filteredExpenses = expenses
    .filter(expense => 
      expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortColumn === 'date') {
        return sortDirection === 'asc' 
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortColumn === 'amount') {
        return sortDirection === 'asc' 
          ? a.amount - b.amount
          : b.amount - a.amount;
      } else if (sortColumn === 'category') {
        return sortDirection === 'asc'
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      }
      return 0;
    });
  
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="payments" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <ReceiptIcon className="h-4 w-4" />
              Expenses
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
                      onClick={() => handleSort('studentName')}
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
                      onClick={() => handleSort('date')}
                      className="gap-1 font-medium"
                    >
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="" alt={payment.studentName || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {payment.studentName ? payment.studentName.split(' ').map(n => n[0]).join('') : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{payment.studentName || 'Unknown Student'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="font-medium">
                        ${payment.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>{payment.notes}</TableCell>
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
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('category')}
                      className="gap-1 font-medium"
                    >
                      Category
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Name</TableHead>
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
                      onClick={() => handleSort('date')}
                      className="gap-1 font-medium"
                    >
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No expenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-100">
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{expense.name}</TableCell>
                      <TableCell className="font-medium text-red-600">
                        ${expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {expense.recurring ? (
                          <Badge variant="outline" className="gap-1 bg-purple-100 text-purple-800 border-purple-200">
                            <Repeat className="h-3 w-3" />
                            <span className="capitalize">{expense.frequency || 'Yes'}</span>
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">One-time</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{expense.notes}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExpense(expense)}
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

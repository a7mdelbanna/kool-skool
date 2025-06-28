
import React, { useState } from 'react';
import { DollarSign, Search, Filter as FilterIcon } from 'lucide-react';
import ExpectedPaymentsSection from '@/components/ExpectedPaymentsSection';
import AccountsBalanceSection from '@/components/AccountsBalanceSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const FinancesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const schoolId = getSchoolId();

  // Fetch available currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ['school-currencies', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase.rpc('get_school_currencies', {
        p_school_id: schoolId
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Set default currency when currencies are loaded
  React.useEffect(() => {
    if (currencies.length > 0 && !selectedCurrency) {
      const defaultCurrency = currencies.find(c => c.is_default);
      if (defaultCurrency) {
        setSelectedCurrency(defaultCurrency.id);
      }
    }
  }, [currencies, selectedCurrency]);

  // Fetch all student payments
  const { data: payments = [] } = useQuery({
    queryKey: ['all-student-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          users!inner(first_name, last_name)
        `)
        .eq('school_id', schoolId);

      if (studentsError) throw studentsError;

      const studentIds = students?.map(s => s.id) || [];
      if (studentIds.length === 0) return [];

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('student_payments')
        .select('*')
        .in('student_id', studentIds)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      const combinedPayments = paymentsData?.map(payment => {
        const student = students?.find(s => s.id === payment.student_id);
        return {
          ...payment,
          student_name: student?.users ? 
            `${(student.users as any).first_name} ${(student.users as any).last_name}` : 
            'Unknown Student'
        };
      }) || [];

      return combinedPayments;
    },
    enabled: !!schoolId,
  });

  // Fetch all transactions from the transactions table
  const { data: transactions = [] } = useQuery({
    queryKey: ['school-transactions', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .rpc('get_school_transactions', { p_school_id: schoolId });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Convert amount to selected currency
  const convertAmount = (amount: number, fromCurrency: string, toCurrencyId: string) => {
    if (!currencies.length || !selectedCurrency) return amount;
    
    const fromCurrencyData = currencies.find(c => c.code === fromCurrency);
    const toCurrencyData = currencies.find(c => c.id === toCurrencyId);
    
    if (!fromCurrencyData || !toCurrencyData) return amount;
    
    // Convert to base currency first (default currency), then to target currency
    const baseAmount = fromCurrencyData.is_default ? amount : amount / fromCurrencyData.exchange_rate;
    const convertedAmount = toCurrencyData.is_default ? baseAmount : baseAmount * toCurrencyData.exchange_rate;
    
    return convertedAmount;
  };

  // Get currency symbol for display
  const getCurrencySymbol = () => {
    if (!selectedCurrency || !currencies.length) return '$';
    const currency = currencies.find(c => c.id === selectedCurrency);
    return currency ? currency.symbol : '$';
  };

  // Calculate statistics with currency conversion
  const calculateStats = () => {
    const paidPayments = payments.filter(payment => payment.status === 'completed');
    const pendingPayments = payments.filter(payment => payment.status === 'pending');
    
    const totalRevenue = paidPayments.reduce((sum, payment) => {
      const convertedAmount = convertAmount(Number(payment.amount), payment.currency, selectedCurrency);
      return sum + convertedAmount;
    }, 0);
    
    const pendingAmount = pendingPayments.reduce((sum, payment) => {
      const convertedAmount = convertAmount(Number(payment.amount), payment.currency, selectedCurrency);
      return sum + convertedAmount;
    }, 0);
    
    // Add transaction stats
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    const totalTransactionIncome = incomeTransactions.reduce((sum, t) => {
      const convertedAmount = convertAmount(Number(t.amount), t.currency, selectedCurrency);
      return sum + convertedAmount;
    }, 0);
    
    const totalExpenses = expenseTransactions.reduce((sum, t) => {
      const convertedAmount = convertAmount(Number(t.amount), t.currency, selectedCurrency);
      return sum + convertedAmount;
    }, 0);
    
    const netIncome = (totalRevenue + totalTransactionIncome) - totalExpenses;

    return {
      netIncome,
      totalRevenue: totalRevenue + totalTransactionIncome,
      totalExpenses,
      pendingAmount
    };
  };

  const stats = calculateStats();

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
      category_name: undefined as string | undefined,
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
      category_name: t.category_name || undefined,
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter transactions based on search term and type filter
  const filteredTransactions = allTransactions.filter(transaction => {
    const matchesSearch = transaction.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = transactionTypeFilter === 'all' || 
      (transactionTypeFilter === 'income' && (transaction.type === 'income' || transaction.type === 'student_payment')) ||
      (transactionTypeFilter === 'expense' && transaction.type === 'expense');

    return matchesSearch && matchesType;
  });

  if (!schoolId) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Finances</h1>
            <p className="text-muted-foreground">Overview of your financial accounts and expected payments</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-amber-600 text-lg">No school ID found</p>
          <p className="text-muted-foreground">Please refresh the page and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-7 w-7" />
            Finances
          </h1>
          <p className="text-muted-foreground">Overview of your financial accounts and expected payments</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Currency:</span>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.id} value={currency.id}>
                  {currency.symbol} {currency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Net Income</CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {getCurrencySymbol()}{stats.netIncome.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Revenue minus expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getCurrencySymbol()}{stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">From all payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total Expenses</CardTitle>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {getCurrencySymbol()}{stats.totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All business expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Sections */}
      <Accordion type="multiple" defaultValue={["accounts", "payments", "transactions"]} className="w-full">
        {/* Account Balances Section */}
        <AccordionItem value="accounts" className="border rounded-lg mb-4">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5" />
              Account Balances
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <AccountsBalanceSection schoolId={schoolId} />
          </AccordionContent>
        </AccordionItem>

        {/* Expected Payments Section */}
        <AccordionItem value="payments" className="border rounded-lg mb-4">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5" />
              Expected Payments
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <ExpectedPaymentsSection schoolId={schoolId} />
          </AccordionContent>
        </AccordionItem>

        {/* Transactions Section */}
        <AccordionItem value="transactions" className="border rounded-lg mb-4">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5" />
              Transactions
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            {/* Filter Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <Button
                  variant={transactionTypeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransactionTypeFilter('all')}
                >
                  All Transactions ({allTransactions.length})
                </Button>
                <Button
                  variant={transactionTypeFilter === 'income' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransactionTypeFilter('income')}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Income ({allTransactions.filter(t => t.type === 'income' || t.type === 'student_payment').length})
                </Button>
                <Button
                  variant={transactionTypeFilter === 'expense' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransactionTypeFilter('expense')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Expenses ({allTransactions.filter(t => t.type === 'expense').length})
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
                  <FilterIcon className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Transactions Table */}
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
                  <TableHead>Notes</TableHead>
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
                    <TableCell className={transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                      {transaction.type === 'expense' ? '-' : ''}
                      {getCurrencySymbol()}{convertAmount(Number(transaction.amount), transaction.currency, selectedCurrency).toFixed(2)}
                    </TableCell>
                    <TableCell>{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{transaction.method || '-'}</TableCell>
                    <TableCell>{transaction.category_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{transaction.notes || '-'}</TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default FinancesPage;

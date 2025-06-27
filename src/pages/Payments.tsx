import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUserInfo, getSchoolTransactions, createTransaction } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PaymentsPage = () => {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    currency: 'USD',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    contact_id: '',
    category_id: '',
    from_account_id: '',
    to_account_id: '',
    payment_method: '',
    receipt_number: '',
    receipt_url: '',
    tax_amount: '',
    tax_rate: '',
    is_recurring: false,
    recurring_frequency: '',
    recurring_end_date: '',
    tag_ids: [] as string[]
  });
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  // Fetch transactions
  const { data: rawTransactions = [], refetch } = useQuery({
    queryKey: ['school-transactions', userInfo?.[0]?.user_school_id],
    queryFn: () => getSchoolTransactions(userInfo?.[0]?.user_school_id as string),
    enabled: !!userInfo?.[0]?.user_school_id,
  });

  // Transform the data to include the tag information
  const transactions = rawTransactions ? rawTransactions.map(transaction => {
    const tags = transaction.tags ? transaction.tags.map(tag => tag.name) : [];
    return {
      ...transaction,
      tags: tags
    };
  }) : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setDate(date);
    setFormData(prev => ({ ...prev, transaction_date: date ? format(date, 'yyyy-MM-dd') : '' }));
  };

  const handleCreateTransaction = async (formData: any) => {
    try {
      // Validate required fields
      if (!formData.amount || !formData.description) {
        toast.error('Amount and description are required');
        return;
      }

      // Get current user data from localStorage
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.schoolId) {
        toast.error('User not authenticated or school not found');
        return;
      }

      // Call the imported createTransaction function from the Supabase client
      await createTransaction({
        school_id: user.schoolId,
        type: formData.type || 'income',
        amount: parseFloat(formData.amount),
        currency: formData.currency || 'USD',
        transaction_date: formData.transaction_date || new Date().toISOString().split('T')[0],
        description: formData.description,
        notes: formData.notes,
        contact_id: formData.contact_id,
        category_id: formData.category_id,
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number,
        receipt_url: formData.receipt_url,
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : 0,
        tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) : 0,
        is_recurring: formData.is_recurring || false,
        recurring_frequency: formData.recurring_frequency,
        recurring_end_date: formData.recurring_end_date,
        tag_ids: formData.tag_ids
      });

      toast.success('Transaction created successfully');
      refetch();
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await handleCreateTransaction(formData);
      setFormData({
        type: 'income',
        amount: '',
        currency: 'USD',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        notes: '',
        contact_id: '',
        category_id: '',
        from_account_id: '',
        to_account_id: '',
        payment_method: '',
        receipt_number: '',
        receipt_url: '',
        tax_amount: '',
        tax_rate: '',
        is_recurring: false,
        recurring_frequency: '',
        recurring_end_date: '',
        tag_ids: []
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Payments</h1>

      {/* Transaction Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add Transaction</CardTitle>
          <CardDescription>Record a new income or expense.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter description"
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Enter notes"
              />
            </div>

            <div>
              <Label htmlFor="transaction_date">Transaction Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    {date ? (
                      format(date, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Transaction"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>A history of all your transactions.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.transaction_date}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{transaction.amount} {transaction.currency}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'income' ? 'outline' : 'destructive'}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.tags && transaction.tags.length > 0 ? (
                      transaction.tags.map((tag, index) => (
                        <Badge key={index} className="mr-1">{tag}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No tags</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPage;

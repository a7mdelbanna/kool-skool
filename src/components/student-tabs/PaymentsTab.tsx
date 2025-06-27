
import React, { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, CreditCard, DollarSign, Euro, Plus, Receipt, Trash, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Student } from "@/components/StudentCard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSchoolTransactions, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
  isViewMode?: boolean;
}

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, { message: "Amount must be greater than 0" }),
  date: z.date({ required_error: "Payment date is required" }),
  method: z.string().min(1, { message: "Payment method is required" }),
  notes: z.string().optional(),
  currency: z.string().default("USD"),
  account_id: z.string().min(1, { message: "Account is required" }),
  subscription_id: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const paymentMethods = ["Cash", "Credit Card", "Bank Transfer", "PayPal", "Other"];
const currencies = [
  { symbol: "$", code: "USD", name: "US Dollar", icon: DollarSign },
  { symbol: "€", code: "EUR", name: "Euro", icon: Euro },
  { symbol: "₽", code: "RUB", name: "Russian Ruble", icon: ({ className }: { className?: string }) => (
    <span className={cn("font-bold text-sm", className)}>₽</span>
  )},
];

const PaymentsTab: React.FC<PaymentsTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false 
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);
  const queryClient = useQueryClient();
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      method: "",
      notes: "",
      currency: "USD",
      account_id: "",
      subscription_id: "none",
    },
  });

  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const schoolId = getSchoolId();

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['school-accounts', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase.rpc('get_school_accounts', {
        p_school_id: schoolId
      });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['student-subscriptions', studentData.id],
    queryFn: async () => {
      if (!studentData.id) return [];
      const { data, error } = await supabase.rpc('get_student_subscriptions', {
        p_student_id: studentData.id
      });
      if (error) throw error;
      return data;
    },
    enabled: !!studentData.id,
  });

  // Updated to fetch from transactions instead of student_payments
  const { data: allTransactions = [], isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['school-transactions', schoolId],
    queryFn: () => getSchoolTransactions(schoolId),
    enabled: !!schoolId,
  });

  // Filter transactions to show only payments for this student
  const payments = React.useMemo(() => {
    if (!studentData.firstName || !studentData.lastName || !allTransactions.length) {
      return [];
    }
    
    const studentName = `${studentData.firstName} ${studentData.lastName}`;
    
    return allTransactions.filter(transaction => 
      transaction.type === 'income' && 
      transaction.contact_name === studentName &&
      transaction.contact_type === 'student'
    ).map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      payment_date: transaction.transaction_date,
      payment_method: transaction.payment_method || 'Unknown',
      status: transaction.status,
      notes: transaction.notes || '',
      created_at: transaction.created_at,
    }));
  }, [allTransactions, studentData.firstName, studentData.lastName]);

  React.useEffect(() => {
    if (paymentsError) {
      console.error("Error loading payments:", paymentsError);
      toast.error("Failed to load payment history. Please refresh the page and try again.");
    }
  }, [paymentsError]);

  const addPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      if (!studentData.id || !schoolId) {
        throw new Error("Student ID or School ID missing");
      }

      const selectedAccount = accounts.find(acc => acc.id === data.account_id);
      if (!selectedAccount) {
        throw new Error("Selected account not found");
      }

      if (selectedAccount.currency_code !== data.currency) {
        throw new Error(`Account currency (${selectedAccount.currency_code}) must match payment currency (${data.currency})`);
      }

      const { data: transactionData, error } = await supabase.rpc('create_transaction', {
        p_school_id: schoolId,
        p_type: 'income',
        p_amount: data.amount,
        p_currency: data.currency,
        p_transaction_date: format(data.date, 'yyyy-MM-dd'),
        p_description: `Student payment from ${studentData.firstName || 'Unknown'} ${studentData.lastName || 'Student'}`,
        p_notes: data.notes || '',
        p_to_account_id: data.account_id,
        p_payment_method: data.method,
        p_tag_ids: null
      });

      if (error) throw error;

      if (data.subscription_id && data.subscription_id !== "none") {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ subscription_id: data.subscription_id })
          .eq('id', transactionData);

        if (updateError) throw updateError;
      }

      return transactionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-transactions', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['school-accounts', schoolId] });
      toast.success("Payment added successfully");
      form.reset({
        amount: 0,
        date: new Date(),
        method: "",
        notes: "",
        currency: "USD",
        account_id: "",
        subscription_id: "none",
      });
      setSelectedCurrency(currencies[0]);
    },
    onError: (error: any) => {
      console.error("Error adding payment:", error);
      toast.error(error.message || "Failed to add payment. Please try again.");
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-transactions', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['school-accounts', schoolId] });
      toast.success("Payment deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment. Please try again.");
    },
  });
  
  const handleAddPayment = (data: PaymentFormValues) => {
    if (!studentData.id) {
      toast.error("Student ID is required");
      return;
    }

    console.log("Adding payment with data:", data);
    addPaymentMutation.mutate(data);
  };

  const handleDeletePayment = (paymentId: string) => {
    console.log("Deleting payment with ID:", paymentId);
    deletePaymentMutation.mutate(paymentId);
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode) || currencies[0];
    setSelectedCurrency(currency);
    form.setValue("currency", currencyCode);
    
    form.setValue("account_id", "");
  };

  const compatibleAccounts = accounts.filter(account => 
    account.currency_code === form.watch("currency")
  );

  if (paymentsLoading || accountsLoading || subscriptionsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Payment History</h3>
        {payments.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-muted/30">
            <p className="text-muted-foreground">No payment history</p>
            <p className="text-sm text-muted-foreground">
              {!isViewMode && "Add a new payment below to start tracking"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border rounded-md p-4 flex justify-between items-start"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      {payment.currency ? 
                        currencies.find(c => c.code === payment.currency)?.symbol || '$' 
                        : '$'}{Number(payment.amount).toFixed(2)}
                    </h4>
                    <span className="text-sm text-muted-foreground">
                      via {payment.payment_method}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs",
                      payment.status === 'completed' ? "bg-green-100 text-green-800" :
                      payment.status === 'pending' ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    )}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm my-1">
                    Paid on {format(new Date(payment.payment_date), "PPP")}
                  </p>
                  {payment.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{payment.notes}</p>
                  )}
                </div>
                {!isViewMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePayment(payment.id)}
                    disabled={deletePaymentMutation.isPending}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {!isViewMode && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Add New Payment</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddPayment)} className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select 
                        defaultValue={field.value} 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleCurrencyChange(value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              <div className="flex items-center gap-2">
                                <currency.icon className="h-4 w-4" />
                                <span>{currency.code}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ({selectedCurrency.symbol})</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {selectedCurrency.symbol}
                          </span>
                          <Input type="number" min="0.01" step="0.01" className="pl-7" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account <span className="text-red-500">*</span></FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {compatibleAccounts.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No accounts available for {form.watch("currency")}
                            </div>
                          ) : (
                            compatibleAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex items-center gap-2">
                                  <Wallet className="h-4 w-4" />
                                  <span>{account.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({account.currency_code})
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subscription_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Subscription (Optional)</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subscription" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No subscription</SelectItem>
                          {subscriptions.map((subscription) => (
                            <SelectItem key={subscription.id} value={subscription.id}>
                              <div className="flex items-center gap-2">
                                <span>{subscription.session_count} sessions</span>
                                <span className="text-xs text-muted-foreground">
                                  ({subscription.currency} {subscription.total_price})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {paymentMethods.map((method) => (
                        <Button
                          key={method}
                          type="button"
                          variant={field.value === method ? "default" : "outline"}
                          size="sm"
                          onClick={() => form.setValue("method", method)}
                          className={cn(
                            "h-9",
                            method === "Credit Card" && field.value === method && "bg-blue-600",
                            method === "PayPal" && field.value === method && "bg-indigo-600"
                          )}
                        >
                          {method === "Credit Card" && <CreditCard className="h-4 w-4 mr-2" />}
                          {method === "Cash" && <Receipt className="h-4 w-4 mr-2" />}
                          {method}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about this payment"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={addPaymentMutation.isPending || compatibleAccounts.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                {addPaymentMutation.isPending ? "Adding Payment..." : "Add Payment"}
              </Button>
              
              {compatibleAccounts.length === 0 && form.watch("currency") && (
                <p className="text-sm text-amber-600 text-center">
                  No accounts available for {form.watch("currency")}. Please create an account with this currency first.
                </p>
              )}
            </form>
          </Form>
        </div>
      )}
    </div>
  );
};

export default PaymentsTab;

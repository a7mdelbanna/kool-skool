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
import { CalendarIcon, CreditCard, Plus, Receipt, Trash, Wallet, RefreshCw } from "lucide-react";
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
import { databaseService } from "@/services/firebase/database.service";

interface PaymentsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
  isViewMode?: boolean;
}

const paymentSchema = z.object({
  amount: z.string().refine((val) => val !== '' && parseFloat(val) > 0, { message: "Amount must be greater than 0" }),
  date: z.date({ required_error: "Payment date is required" }),
  method: z.string().min(1, { message: "Payment method is required" }),
  notes: z.string().optional(),
  currency: z.string().default("USD"),
  account_id: z.string().min(1, { message: "Account is required" }),
  subscription_id: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const paymentMethods = ["Cash", "Credit Card", "Bank Transfer", "PayPal", "Other"];

const PaymentsTab: React.FC<PaymentsTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false 
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<any>(null);
  const [isSyncingPaymentStatus, setIsSyncingPaymentStatus] = useState(false);
  const queryClient = useQueryClient();
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
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

  // Fetch currencies from school settings
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery({
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
      console.log('📊 SUBSCRIPTIONS DATA FROM RPC:', data);
      if (data && data.length > 0) {
        data.forEach((sub: any) => {
          console.log(`💰 Subscription ${sub.id}:`, {
            total_price: sub.total_price,
            total_paid: sub.total_paid,
            is_fully_paid: (sub.total_paid || 0) >= (sub.total_price || 0)
          });
        });
      }
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
    if (!studentData.id || !allTransactions.length) {
      console.log('No student ID or transactions:', { studentId: studentData.id, transactionsCount: allTransactions.length });
      return [];
    }
    
    console.log('🔍 Student payments query - Checking all transactions:', {
      studentId: studentData.id,
      totalTransactions: allTransactions.length,
      sampleTransaction: allTransactions[0],
      allTransactionIds: allTransactions.map(t => ({ 
        id: t.id, 
        student_id: t.student_id,
        type: t.type
      }))
    });
    
    // Filter by student_id for Firebase transactions
    const filteredTransactions = allTransactions.filter(transaction => {
      const isIncomeType = transaction.type === 'income';
      const matchesStudentId = transaction.student_id === studentData.id;
      const matchesContactName = transaction.contact_name === `${studentData.firstName} ${studentData.lastName}` && 
                                 transaction.contact_type === 'student';
      
      const shouldInclude = isIncomeType && (matchesStudentId || matchesContactName);
      
      if (isIncomeType && transaction.student_id) {
        console.log('🔎 Checking transaction:', {
          transactionId: transaction.id,
          transactionStudentId: transaction.student_id,
          targetStudentId: studentData.id,
          matches: matchesStudentId,
          shouldInclude
        });
      }
      
      return shouldInclude;
    });
    
    console.log('💰 Filtered payments for student:', {
      studentId: studentData.id,
      paymentsFound: filteredTransactions.length,
      payments: filteredTransactions
    });
    
    return filteredTransactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      payment_date: transaction.transaction_date || transaction.transactionDate || transaction.created_at,
      payment_method: transaction.payment_method || transaction.paymentMethod || 'Cash',
      status: transaction.status || 'completed',
      notes: transaction.notes || '',
      created_at: transaction.created_at,
      subscription_id: transaction.subscription_id,
    }));
  }, [allTransactions, studentData.id, studentData.firstName, studentData.lastName]);

  React.useEffect(() => {
    if (paymentsError) {
      console.error("Error loading payments:", paymentsError);
      toast.error("Failed to load payment history. Please refresh the page and try again.");
    }
  }, [paymentsError]);

  // Simple function to directly set payment status based on subscription data
  const setPaymentStatusDirect = async (studentId: string, status: string) => {
    try {
      console.log(`🎯 DIRECT: Setting payment status to ${status} for student ${studentId}`);
      
      // Update both field names to ensure compatibility
      const updateData = {
        paymentStatus: status,
        payment_status: status,
        lastPaymentStatusUpdate: new Date().toISOString()
      };
      
      await databaseService.update('students', studentId, updateData);
      console.log('✅ DIRECT: Payment status updated successfully');
      
      // Force refresh
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      
      return status;
    } catch (error) {
      console.error('❌ DIRECT: Error updating payment status:', error);
      return null;
    }
  };

  // Function to calculate and update student payment status using Firebase only
  const updateStudentPaymentStatus = async (studentId: string, subscriptionId?: string) => {
    try {
      console.log('🔄 Updating student payment status for:', { studentId, subscriptionId });
      
      // Fetch subscriptions directly from Firebase
      const subscriptions = await databaseService.query('subscriptions', {
        where: [{ field: 'student_id', operator: '==', value: studentId }]
      });
      
      console.log('📊 Firebase subscriptions found:', subscriptions);
      
      if (!subscriptions || subscriptions.length === 0) {
        console.log('No subscriptions found for student');
        // If no subscriptions, set status to pending
        const updateResult = await databaseService.update('students', studentId, {
          paymentStatus: 'pending',
          payment_status: 'pending' // Also update snake_case version
        });
        console.log('Updated to pending:', updateResult);
        queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
        return 'pending';
      }
      
      // Calculate total payments for all subscriptions
      let totalPrice = 0;
      let totalPaid = 0;
      
      // For each subscription, get payments from transactions
      for (const subscription of subscriptions) {
        const subscriptionPrice = subscription.total_price || 0;
        totalPrice += subscriptionPrice;
        
        // Get all transactions linked to this subscription
        const transactions = await databaseService.query('transactions', {
          where: [
            { field: 'subscription_id', operator: '==', value: subscription.id },
            { field: 'type', operator: '==', value: 'income' }
          ]
        });
        
        // Also get transactions for this student without subscription link
        const studentTransactions = await databaseService.query('transactions', {
          where: [
            { field: 'student_id', operator: '==', value: studentId },
            { field: 'type', operator: '==', value: 'income' }
          ]
        });
        
        // Also check if subscription already has total_paid field
        const subscriptionTotalPaid = subscription.total_paid || 0;
        console.log(`💳 Subscription ${subscription.id} has total_paid field:`, subscriptionTotalPaid);
        
        // Calculate payments for this subscription
        let subscriptionPaid = 0;
        
        // Add linked transactions
        if (transactions && transactions.length > 0) {
          subscriptionPaid += transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        }
        
        // If only one subscription and unlinked student payments exist, count them too
        if (subscriptions.length === 1 && studentTransactions && studentTransactions.length > 0) {
          const unlinkedPayments = studentTransactions
            .filter(t => !t.subscription_id)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
          subscriptionPaid += unlinkedPayments;
        }
        
        totalPaid += subscriptionPaid;
        
        console.log(`📊 Subscription ${subscription.id}:`, {
          price: subscriptionPrice,
          paid: subscriptionPaid,
          transactions: transactions?.length || 0,
          studentTransactions: studentTransactions?.length || 0
        });
      }
      
      console.log('💵 Total calculation:', {
        totalPrice,
        totalPaid,
        percentage: totalPrice > 0 ? ((totalPaid / totalPrice) * 100).toFixed(2) + '%' : '0%'
      });
      
      // Calculate payment status based on percentage
      let paymentStatus = 'pending';
      if (totalPrice > 0) {
        const paymentPercentage = (totalPaid / totalPrice) * 100;
        console.log(`💰 Total payment percentage: ${paymentPercentage.toFixed(2)}% (${totalPaid} of ${totalPrice})`);
        
        if (paymentPercentage >= 100) {
          paymentStatus = 'paid';
        } else if (paymentPercentage > 0) {
          paymentStatus = 'partial';
        } else {
          // Check if any subscription is overdue
          const hasOverdue = subscriptions.some(sub => {
            if (!sub.end_date) return false;
            const endDate = new Date(sub.end_date);
            return endDate < new Date();
          });
          
          if (hasOverdue) {
            paymentStatus = 'overdue';
          }
        }
      }
      
      console.log(`✅ Updating student ${studentId} payment status to: ${paymentStatus}`);
      
      // Update both camelCase and snake_case fields to ensure compatibility
      const updateData = {
        paymentStatus: paymentStatus,
        payment_status: paymentStatus // Also update snake_case version
      };
      
      console.log('📝 Updating Firebase with:', {
        studentId,
        updateData
      });
      
      const updateResult = await databaseService.update('students', studentId, updateData);
      console.log('Firebase update result:', updateResult);
      
      console.log('🎉 Student payment status updated successfully in Firebase');
      
      // Force refresh of students data
      console.log('🔄 Forcing refresh of students list');
      await queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      await queryClient.refetchQueries({ queryKey: ['students', schoolId] });
      
      // Return the new payment status so caller can update local state
      return paymentStatus;
      
    } catch (error) {
      console.error('❌ Error updating student payment status:', error);
      // Don't throw error to prevent payment creation from failing
      return null;
    }
  };

  // Only update payment status after actual payment changes, not on mount
  // This prevents overwriting correct status with stale calculations

  // Manual sync function for payment status
  const handleSyncPaymentStatus = async () => {
    if (!studentData.id) {
      toast.error("Student ID is required");
      return;
    }
    
    setIsSyncingPaymentStatus(true);
    try {
      // First, let's check what's actually in Firebase for this student
      console.log('🔍 Checking current student data in Firebase...');
      const currentStudent = await databaseService.getById('students', studentData.id);
      console.log('👤 Current student in Firebase:', currentStudent);
      
      // Check if we have subscription data showing it's fully paid
      if (subscriptions && subscriptions.length > 0) {
        console.log('📄 Checking subscription payment status from RPC data...');
        let totalPrice = 0;
        let totalPaid = 0;
        
        for (const sub of subscriptions) {
          totalPrice += sub.total_price || 0;
          totalPaid += sub.total_paid || 0;
          console.log(`Subscription ${sub.id}: price=${sub.total_price}, paid=${sub.total_paid}`);
        }
        
        let paymentStatus = 'pending';
        if (totalPrice > 0) {
          const percentage = (totalPaid / totalPrice) * 100;
          console.log(`📊 Payment percentage: ${percentage.toFixed(2)}% (${totalPaid}/${totalPrice})`);
          
          if (percentage >= 100) {
            paymentStatus = 'paid';
          } else if (percentage > 0) {
            paymentStatus = 'partial';
          }
        }
        
        console.log(`🎯 Setting payment status directly to: ${paymentStatus}`);
        const newStatus = await setPaymentStatusDirect(studentData.id, paymentStatus);
        
        // Update local state
        if (newStatus && setStudentData) {
          setStudentData(prev => ({
            ...prev,
            paymentStatus: newStatus as any
          }));
        }
        
        toast.success(`Payment status synced: ${newStatus}`);
      } else {
        // Fallback to Firebase calculation
        const newStatus = await updateStudentPaymentStatus(studentData.id);
        
        // Update local state with the new payment status
        if (newStatus && setStudentData) {
          setStudentData(prev => ({
            ...prev,
            paymentStatus: newStatus as any
          }));
        }
        
        toast.success(`Payment status synced: ${newStatus}`);
      }
      
      // Check the student data again after update
      const updatedStudent = await databaseService.getById('students', studentData.id);
      console.log('✅ Updated student in Firebase:', updatedStudent);
      
      // Force a page refresh after a short delay to ensure data is updated
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error syncing payment status:", error);
      toast.error("Failed to sync payment status");
    } finally {
      setIsSyncingPaymentStatus(false);
    }
  };

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
        p_amount: parseFloat(data.amount),
        p_currency: data.currency,
        p_transaction_date: format(data.date, 'yyyy-MM-dd'),
        p_description: `Student payment from ${studentData.firstName || 'Unknown'} ${studentData.lastName || 'Student'}`,
        p_notes: data.notes || '',
        p_to_account_id: data.account_id,
        p_payment_method: data.method,
        p_tag_ids: null,
        p_student_id: studentData.id // Add student_id to link the payment
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
    onSuccess: async (transactionId, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-transactions', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['school-accounts', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['student-subscriptions', studentData.id] });
      toast.success("Payment added successfully");
      
      // Update student payment status after successful payment
      if (studentData.id) {
        const newStatus = await updateStudentPaymentStatus(studentData.id, variables.subscription_id);
        
        // Update local state with the new payment status
        if (newStatus && setStudentData) {
          setStudentData(prev => ({
            ...prev,
            paymentStatus: newStatus as any
          }));
        }
      }
      
      form.reset({
        amount: "",
        date: new Date(),
        method: "",
        notes: "",
        currency: "USD",
        account_id: "",
        subscription_id: "none",
      });
      setSelectedCurrency(currencies[0] || null);
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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['school-transactions', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['school-accounts', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['student-subscriptions', studentData.id] });
      toast.success("Payment deleted successfully");
      
      // Update student payment status after deleting payment
      if (studentData.id) {
        const newStatus = await updateStudentPaymentStatus(studentData.id);
        
        // Update local state with the new payment status
        if (newStatus && setStudentData) {
          setStudentData(prev => ({
            ...prev,
            paymentStatus: newStatus as any
          }));
        }
      }
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
    const currency = currencies.find(c => (c.code || c.currency_code) === currencyCode) || currencies[0];
    setSelectedCurrency(currency);
    form.setValue("currency", currencyCode);
    
    form.setValue("account_id", "");
  };

  // Set initial selected currency when currencies are loaded
  React.useEffect(() => {
    if (currencies.length > 0 && !selectedCurrency) {
      const defaultCurrency = currencies[0];
      setSelectedCurrency(defaultCurrency);
      form.setValue("currency", defaultCurrency.code || defaultCurrency.currency_code);
    }
  }, [currencies, selectedCurrency, form]);

  const compatibleAccounts = accounts.filter(account => 
    account.currency_code === form.watch("currency")
  );

  // Helper function to safely format dates
  const safeFormatDate = (dateValue: string | Date | null | undefined, formatStr: string = "MMM do"): string => {
    if (!dateValue) return "Not set";
    
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date value:", dateValue);
        return "Invalid date";
      }
      
      return format(date, formatStr);
    } catch (error) {
      console.error("Error formatting date:", error, "Value:", dateValue);
      return "Invalid date";
    }
  };

  // Helper function to calculate end date safely
  const calculateEndDate = (startDate: string | Date | null | undefined, durationMonths: number): string => {
    if (!startDate || !durationMonths) return "Not calculated";
    
    try {
      const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
      
      // Check if the start date is valid
      if (isNaN(start.getTime())) {
        console.warn("Invalid start date for calculation:", startDate);
        return "Invalid start date";
      }
      
      // Calculate end date by adding months
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + durationMonths);
      
      return format(endDate, "MMM do");
    } catch (error) {
      console.error("Error calculating end date:", error);
      return "Calculation error";
    }
  };

  // Helper function to get subscription info for a payment
  const getSubscriptionInfo = (subscriptionId: string | null) => {
    if (!subscriptionId) return null;
    
    const subscription = subscriptions.find(sub => sub.id === subscriptionId);
    if (!subscription) return null;

    const startDate = safeFormatDate(subscription.start_date);
    const endDate = subscription.end_date 
      ? safeFormatDate(subscription.end_date)
      : calculateEndDate(subscription.start_date, subscription.duration_months);
    
    return {
      title: `${subscription.session_count} Sessions`,
      duration: `${startDate} to ${endDate}`,
      totalPrice: subscription.total_price,
      currency: subscription.currency
    };
  };

  if (paymentsLoading || accountsLoading || subscriptionsLoading || currenciesLoading) {
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium">Payment History</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncPaymentStatus}
              disabled={isSyncingPaymentStatus || !studentData.id}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncingPaymentStatus && "animate-spin")} />
              {isSyncingPaymentStatus ? "Syncing..." : "Sync Payment Status"}
            </Button>
            {subscriptions && subscriptions.length > 0 && subscriptions.some(s => (s.total_paid || 0) >= (s.total_price || 0)) && (
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  if (studentData.id) {
                    const result = await setPaymentStatusDirect(studentData.id, 'paid');
                    if (result) {
                      toast.success('Payment status set to PAID');
                      setTimeout(() => window.location.reload(), 1000);
                    }
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark as Paid
              </Button>
            )}
          </div>
        </div>
        {payments.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-muted/30">
            <p className="text-muted-foreground">No payment history</p>
            <p className="text-sm text-muted-foreground">
              {!isViewMode && "Add a new payment below to start tracking"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => {
              const subscriptionInfo = getSubscriptionInfo(payment.subscription_id);
              
              return (
                <div
                  key={payment.id}
                  className="border rounded-md p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
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
                      Paid on {safeFormatDate(payment.payment_date, "PPP")}
                    </p>
                    
                    {/* Linked Subscription Information */}
                    {subscriptionInfo && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm font-medium text-blue-800">
                          Linked Subscription: {subscriptionInfo.title}
                        </p>
                        <p className="text-xs text-blue-600">
                          {subscriptionInfo.duration}
                        </p>
                      </div>
                    )}
                    
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
              );
            })}
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
                            <SelectItem key={currency.code || currency.currency_code} value={currency.code || currency.currency_code}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{currency.symbol || currency.currency_symbol}</span>
                                <span>{currency.code || currency.currency_code}</span>
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
                      <FormLabel>Amount ({selectedCurrency ? (selectedCurrency.symbol || selectedCurrency.currency_symbol) : ''})</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {selectedCurrency ? (selectedCurrency.symbol || selectedCurrency.currency_symbol) : ''}
                          </span>
                          <Input type="number" min="0.01" step="0.01" className="pl-7" placeholder="0.00" {...field} />
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

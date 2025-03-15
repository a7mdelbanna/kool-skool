
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
import { CalendarIcon, CreditCard, Plus, Receipt, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Student } from "@/components/StudentCard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface PaymentsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
}

interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  notes: string;
  status: "completed" | "pending" | "failed";
}

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, { message: "Amount must be greater than 0" }),
  date: z.date({ required_error: "Payment date is required" }),
  method: z.string().min(1, { message: "Payment method is required" }),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const paymentMethods = ["Cash", "Credit Card", "Bank Transfer", "PayPal", "Other"];

const PaymentsTab: React.FC<PaymentsTabProps> = ({ studentData, setStudentData }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      method: "",
      notes: "",
    },
  });
  
  const handleAddPayment = (data: PaymentFormValues) => {
    const newPayment: Payment = {
      id: Date.now().toString(),
      ...data,
      status: "completed",
    };
    
    setPayments([...payments, newPayment]);
    form.reset();
  };
  
  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter(payment => payment.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Payment History</h3>
        {payments.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-muted/30">
            <p className="text-muted-foreground">No payment history</p>
            <p className="text-sm text-muted-foreground">
              Add a new payment below to start tracking
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
                    <h4 className="font-medium">${payment.amount.toFixed(2)}</h4>
                    <span className="text-sm text-muted-foreground">
                      via {payment.method}
                    </span>
                  </div>
                  <p className="text-sm my-1">
                    Paid on {format(payment.date, "PPP")}
                  </p>
                  {payment.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{payment.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePayment(payment.id)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Add New Payment</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddPayment)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
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
                              "pl-3 text-left font-normal",
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default PaymentsTab;

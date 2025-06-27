
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Payment, usePayments } from '@/contexts/PaymentContext';
import { useToast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment;
  mode: 'add' | 'edit';
}

const PaymentDialog = ({ open, onOpenChange, payment, mode }: PaymentDialogProps) => {
  const { addPayment, updatePayment, accounts } = usePayments();
  const { toast } = useToast();

  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<Date>(new Date());
  const [method, setMethod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<"completed" | "pending" | "failed">('completed');
  const [accountId, setAccountId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');

  // Initialize form when payment changes or dialog opens
  useEffect(() => {
    if (payment && mode === 'edit') {
      setAmount(payment.amount);
      setDate(new Date(payment.date));
      setMethod(payment.method);
      setNotes(payment.notes);
      setStatus(payment.status);
      setAccountId(payment.accountId || '');
      setStudentName(payment.studentName || '');
    } else {
      // Default values for add mode
      setAmount(0);
      setDate(new Date());
      setMethod('');
      setNotes('');
      setStatus('completed');
      setAccountId('');
      setStudentName('');
    }
  }, [payment, mode, open]);

  const handleSubmit = () => {
    if (!amount) {
      toast({
        title: "Error",
        description: "Amount is required",
        variant: "destructive",
      });
      return;
    }

    const paymentData = {
      amount,
      date,
      method: method || 'Cash',
      notes,
      status,
      accountId,
      studentName,
    };

    if (mode === 'add') {
      addPayment(paymentData as Required<typeof paymentData>);
      toast({
        title: "Payment added",
        description: `Payment of $${amount} has been added.`,
      });
    } else if (payment) {
      updatePayment(payment.id, paymentData);
      toast({
        title: "Payment updated",
        description: `Payment of $${amount} has been updated.`,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New Payment' : 'Edit Payment'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Record a new payment received from a student.' 
              : 'Update the payment details.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <div className="col-span-3 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                className="pl-7"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="method" className="text-right">
              Method
            </Label>
            <div className="col-span-3">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="PayPal">PayPal</SelectItem>
                  <SelectItem value="Venmo">Venmo</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <div className="col-span-3">
              <Select value={status} onValueChange={(value: "completed" | "pending" | "failed") => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Completed</span>
                  </SelectItem>
                  <SelectItem value="pending" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>Pending</span>
                  </SelectItem>
                  <SelectItem value="failed" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>Failed</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {accounts.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="account" className="text-right">
                Account
              </Label>
              <div className="col-span-3">
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="student" className="text-right">
              Student
            </Label>
            <Input
              id="student"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Student name"
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes here"
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            {mode === 'add' ? 'Add Payment' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;

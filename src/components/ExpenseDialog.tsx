
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Repeat } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Expense, usePayments } from '@/contexts/PaymentContext';
import { useToast } from '@/hooks/use-toast';

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
  mode: 'add' | 'edit';
}

const ExpenseDialog = ({ open, onOpenChange, expense, mode }: ExpenseDialogProps) => {
  const { addExpense, updateExpense, expenseCategories, accounts } = usePayments();
  const { toast } = useToast();

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [category, setCategory] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<string>('monthly');
  const [accountId, setAccountId] = useState<string>('');

  // Initialize form when expense changes or dialog opens
  useEffect(() => {
    if (expense && mode === 'edit') {
      setAmount(expense.amount?.toString() || '');
      setDate(new Date(expense.date));
      setCategory(expense.category);
      setName(expense.name);
      setNotes(expense.notes);
      setRecurring(expense.recurring);
      setFrequency(expense.frequency || 'monthly');
      setAccountId(expense.accountId || '');
    } else {
      // Default values for add mode
      setAmount('');
      setDate(new Date());
      setCategory('');
      setName('');
      setNotes('');
      setRecurring(false);
      setFrequency('monthly');
      setAccountId('');
    }
  }, [expense, mode, open]);

  const handleSubmit = () => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Error",
        description: "Amount is required and must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    if (!category) {
      toast({
        title: "Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    const expenseData = {
      amount: numericAmount,
      date,
      category,
      name,
      notes,
      recurring,
      frequency: recurring ? frequency : undefined,
      accountId,
    };

    if (mode === 'add') {
      addExpense(expenseData as Required<typeof expenseData>);
      toast({
        title: "Expense added",
        description: `Expense of $${numericAmount} has been added.`,
      });
    } else if (expense) {
      updateExpense(expense.id, expenseData);
      toast({
        title: "Expense updated",
        description: `Expense of $${numericAmount} has been updated.`,
      });
    }

    onOpenChange(false);
  };

  // Get expense name suggestions based on selected category
  const getExpenseNameSuggestions = () => {
    const selectedCategory = expenseCategories.find(cat => cat.name === category);
    return selectedCategory?.expenseNames || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New Expense' : 'Edit Expense'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Record a new expense for your school.' 
              : 'Update the expense details.'}
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
                onChange={(e) => setAmount(e.target.value)}
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
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <div className="col-span-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <div className="col-span-3">
              <Select value={name} onValueChange={setName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type expense name" />
                </SelectTrigger>
                <SelectContent>
                  {getExpenseNameSuggestions().map((name, index) => (
                    <SelectItem key={index} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recurring" className="text-right">
              Recurring
            </Label>
            <div className="flex items-center gap-2 col-span-3">
              <Switch 
                id="recurring" 
                checked={recurring} 
                onCheckedChange={setRecurring} 
              />
              <span className="text-sm text-muted-foreground">
                {recurring ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          
          {recurring && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="frequency" className="text-right">
                Frequency
              </Label>
              <div className="col-span-3">
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
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
            {mode === 'add' ? 'Add Expense' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseDialog;

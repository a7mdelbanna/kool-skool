
import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUserInfo, getSchoolTags, createTransaction } from '@/integrations/supabase/client';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddTransactionDialog = ({ open, onOpenChange, onSuccess }: AddTransactionDialogProps) => {
  const [activeTab, setActiveTab] = useState('income');
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    currency: 'USD',
    transactionDate: new Date(),
    description: '',
    notes: '',
    contactId: '',
    categoryId: '',
    fromAccountId: '',
    toAccountId: '',
    paymentMethod: '',
    receiptNumber: '',
    receiptUrl: '',
    taxAmount: '',
    taxRate: '',
    isRecurring: false,
    recurringFrequency: '',
    recurringEndDate: null as Date | null,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  // Fetch available tags
  const { data: availableTags = [] } = useQuery({
    queryKey: ['school-tags', userInfo?.[0]?.user_school_id],
    queryFn: () => getSchoolTags(userInfo?.[0]?.user_school_id as string),
    enabled: !!userInfo?.[0]?.user_school_id,
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        type: 'income',
        amount: '',
        currency: 'USD',
        transactionDate: new Date(),
        description: '',
        notes: '',
        contactId: '',
        categoryId: '',
        fromAccountId: '',
        toAccountId: '',
        paymentMethod: '',
        receiptNumber: '',
        receiptUrl: '',
        taxAmount: '',
        taxRate: '',
        isRecurring: false,
        recurringFrequency: '',
        recurringEndDate: null,
      });
      setSelectedTags([]);
      setActiveTab('income');
    }
  }, [open]);

  // Update form type when tab changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, type: activeTab }));
  }, [activeTab]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async () => {
    if (!formData.amount || !formData.description) {
      toast.error('Amount and description are required');
      return;
    }

    if (!userInfo?.[0]?.user_school_id) {
      toast.error('No school ID found');
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        school_id: userInfo[0].user_school_id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        transaction_date: format(formData.transactionDate, 'yyyy-MM-dd'),
        description: formData.description,
        notes: formData.notes || undefined,
        contact_id: formData.contactId || undefined,
        category_id: formData.categoryId || undefined,
        from_account_id: formData.fromAccountId || undefined,
        to_account_id: formData.toAccountId || undefined,
        payment_method: formData.paymentMethod || undefined,
        receipt_number: formData.receiptNumber || undefined,
        receipt_url: formData.receiptUrl || undefined,
        tax_amount: formData.taxAmount ? parseFloat(formData.taxAmount) : 0,
        tax_rate: formData.taxRate ? parseFloat(formData.taxRate) : 0,
        is_recurring: formData.isRecurring,
        recurring_frequency: formData.recurringFrequency || undefined,
        recurring_end_date: formData.recurringEndDate ? format(formData.recurringEndDate, 'yyyy-MM-dd') : undefined,
        tag_ids: selectedTags.length > 0 ? selectedTags : undefined,
      };

      await createTransaction(transactionData);
      
      toast.success('Transaction created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods = ['Cash', 'Credit Card', 'Bank Transfer', 'Check', 'PayPal', 'Other'];
  const currencies = ['USD', 'EUR', 'RUB'];
  const recurringFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Create a new financial transaction for your school.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="income" className="text-green-700">Income</TabsTrigger>
            <TabsTrigger value="expense" className="text-red-700">Expense</TabsTrigger>
            <TabsTrigger value="transfer" className="text-blue-700">Transfer</TabsTrigger>
          </TabsList>

          <div className="space-y-6 mt-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.currency} 
                    onValueChange={(value) => handleInputChange('currency', value)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Transaction Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.transactionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.transactionDate ? format(formData.transactionDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.transactionDate}
                      onSelect={(date) => handleInputChange('transactionDate', date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter transaction description"
              />
            </div>

            <TabsContent value="income" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select 
                    value={formData.paymentMethod} 
                    onValueChange={(value) => handleInputChange('paymentMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select 
                    value={formData.toAccountId} 
                    onValueChange={(value) => handleInputChange('toAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Account</SelectItem>
                      <SelectItem value="bank">Bank Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="expense" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select 
                    value={formData.paymentMethod} 
                    onValueChange={(value) => handleInputChange('paymentMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>From Account</Label>
                  <Select 
                    value={formData.fromAccountId} 
                    onValueChange={(value) => handleInputChange('fromAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Account</SelectItem>
                      <SelectItem value="bank">Bank Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tax Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.taxAmount}
                    onChange={(e) => handleInputChange('taxAmount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => handleInputChange('taxRate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Account</Label>
                  <Select 
                    value={formData.fromAccountId} 
                    onValueChange={(value) => handleInputChange('fromAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Account</SelectItem>
                      <SelectItem value="bank">Bank Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>To Account</Label>
                  <Select 
                    value={formData.toAccountId} 
                    onValueChange={(value) => handleInputChange('toAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Account</SelectItem>
                      <SelectItem value="bank">Bank Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Contact and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact</Label>
                <Select 
                  value={formData.contactId} 
                  onValueChange={(value) => handleInputChange('contactId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contact1">John Doe</SelectItem>
                    <SelectItem value="contact2">Jane Smith</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => handleInputChange('categoryId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category1">Tuition & Fees</SelectItem>
                    <SelectItem value="category2">Office Supplies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Button
                    key={tag.id}
                    type="button"
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTagToggle(tag.id)}
                    className="gap-1"
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                    {selectedTags.includes(tag.id) && <X className="h-3 w-3" />}
                  </Button>
                ))}
              </div>
            </div>

            {/* Receipt Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Receipt Number</Label>
                <Input
                  value={formData.receiptNumber}
                  onChange={(e) => handleInputChange('receiptNumber', e.target.value)}
                  placeholder="Enter receipt number"
                />
              </div>

              <div className="space-y-2">
                <Label>Receipt URL</Label>
                <Input
                  type="url"
                  value={formData.receiptUrl}
                  onChange={(e) => handleInputChange('receiptUrl', e.target.value)}
                  placeholder="https://example.com/receipt.pdf"
                />
              </div>
            </div>

            {/* Recurring Transaction */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => handleInputChange('isRecurring', checked)}
                />
                <Label htmlFor="recurring">Make this a recurring transaction</Label>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select 
                      value={formData.recurringFrequency} 
                      onValueChange={(value) => handleInputChange('recurringFrequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {recurringFrequencies.map(freq => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.recurringEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.recurringEndDate ? format(formData.recurringEndDate, "PPP") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.recurringEndDate}
                          onSelect={(date) => handleInputChange('recurringEndDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formData.amount || !formData.description}
          >
            {isSubmitting ? 'Creating...' : 'Create Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;

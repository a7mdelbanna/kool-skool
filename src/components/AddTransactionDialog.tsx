
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
import { CalendarIcon, Plus, X, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUserInfo, getSchoolTags, createTransaction, supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';

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
    currency: 'USD', // Will be updated when currencies load
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
  const [lockedCurrency, setLockedCurrency] = useState<string | null>(null);

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  const schoolId = userInfo?.[0]?.user_school_id;

  // Fetch available tags
  const { data: availableTags = [] } = useQuery({
    queryKey: ['school-tags', schoolId],
    queryFn: () => getSchoolTags(schoolId as string),
    enabled: !!schoolId,
  });

  // Fetch accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['school-accounts', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase.rpc('get_school_accounts', {
        p_school_id: schoolId
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Fetch categories from Firebase
  const { data: categories = [] } = useQuery({
    queryKey: ['school-categories', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      try {
        const data = await databaseService.query('transactionCategories', {
          where: [{ field: 'schoolId', operator: '==', value: schoolId }]
        });
        return data || [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    },
    enabled: !!schoolId,
  });

  // Fetch contacts from Firebase
  const { data: contacts = [] } = useQuery({
    queryKey: ['school-contacts', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      try {
        const data = await databaseService.query('contacts', {
          where: [{ field: 'schoolId', operator: '==', value: schoolId }]
        });
        return data || [];
      } catch (error) {
        console.error('Error fetching contacts:', error);
        return [];
      }
    },
    enabled: !!schoolId,
  });

  // Fetch currencies from Firebase
  const { data: currencies = [] } = useQuery({
    queryKey: ['school-currencies', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      try {
        const data = await databaseService.query('currencies', {
          where: [{ field: 'schoolId', operator: '==', value: schoolId }]
        });
        return data || [];
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return [];
      }
    },
    enabled: !!schoolId,
  });

  // Set default currency when currencies are loaded
  useEffect(() => {
    if (currencies.length > 0 && formData.currency === 'USD') {
      const defaultCurrency = currencies.find(c => c.is_default || c.isDefault);
      setFormData(prev => ({
        ...prev,
        currency: defaultCurrency?.code || currencies[0].code || 'USD'
      }));
    }
  }, [currencies]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      const defaultCurrency = currencies.find(c => c.is_default || c.isDefault);
      setFormData({
        type: 'income',
        amount: '',
        currency: defaultCurrency?.code || currencies[0]?.code || 'USD',
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
      setLockedCurrency(null);
    }
  }, [open]);

  // Update form type when tab changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, type: activeTab }));
    setLockedCurrency(null); // Reset currency lock when changing tabs
  }, [activeTab]);

  // Handle account selection and currency locking
  const handleAccountSelection = (accountId: string, accountType: 'from' | 'to') => {
    const selectedAccount = accounts.find(acc => acc.id === accountId);
    if (!selectedAccount) return;

    if (accountType === 'from') {
      setFormData(prev => ({ ...prev, fromAccountId: accountId }));
    } else {
      setFormData(prev => ({ ...prev, toAccountId: accountId }));
    }

    // Lock currency based on the selected account
    const newCurrency = selectedAccount.currency_code;
    setFormData(prev => ({ ...prev, currency: newCurrency }));
    setLockedCurrency(newCurrency);

    console.log(`🔒 Currency locked to ${newCurrency} based on account ${selectedAccount.name}`);
  };

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

    // Validate account selection based on transaction type
    if (formData.type === 'income' && !formData.toAccountId) {
      toast.error('Please select an account to receive the income');
      return;
    }

    if (formData.type === 'expense' && !formData.fromAccountId) {
      toast.error('Please select an account for the expense');
      return;
    }

    if (formData.type === 'transfer' && (!formData.fromAccountId || !formData.toAccountId)) {
      toast.error('Please select both source and destination accounts for transfer');
      return;
    }

    if (!schoolId) {
      toast.error('No school ID found');
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        school_id: schoolId,
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
  const recurringFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  // Filter categories by transaction type
  const filteredCategories = categories.filter(cat => 
    cat.type === formData.type || cat.type === 'all'
  );

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
                  <div className="relative">
                    <Select 
                      value={formData.currency} 
                      onValueChange={(value) => handleInputChange('currency', value)}
                      disabled={!!lockedCurrency}
                    >
                      <SelectTrigger className={cn("w-24", lockedCurrency && "opacity-75")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.length > 0 ? (
                          currencies.map(currency => (
                            <SelectItem key={currency.id} value={currency.code}>
                              {currency.symbol} {currency.code}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="USD">$ USD</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {lockedCurrency && (
                      <Lock className="absolute right-8 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
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
                {lockedCurrency && (
                  <p className="text-xs text-muted-foreground">
                    Currency is locked to the selected account's currency
                  </p>
                )}
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
                  <Label>To Account *</Label>
                  <Select 
                    value={formData.toAccountId} 
                    onValueChange={(value) => handleAccountSelection(value, 'to')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color }}
                            />
                            {account.name} ({account.currency_symbol} {account.currency_code})
                          </div>
                        </SelectItem>
                      ))}
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
                  <Label>From Account *</Label>
                  <Select 
                    value={formData.fromAccountId} 
                    onValueChange={(value) => handleAccountSelection(value, 'from')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color }}
                            />
                            {account.name} ({account.currency_symbol} {account.currency_code})
                          </div>
                        </SelectItem>
                      ))}
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
                  <Label>From Account *</Label>
                  <Select 
                    value={formData.fromAccountId} 
                    onValueChange={(value) => handleAccountSelection(value, 'from')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color }}
                            />
                            {account.name} ({account.currency_symbol} {account.currency_code})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>To Account *</Label>
                  <Select 
                    value={formData.toAccountId} 
                    onValueChange={(value) => handleAccountSelection(value, 'to')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color }}
                            />
                            {account.name} ({account.currency_symbol} {account.currency_code})
                          </div>
                        </SelectItem>
                      ))}
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
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{contact.name}</span>
                          <span className="text-xs text-muted-foreground">{contact.type}</span>
                        </div>
                      </SelectItem>
                    ))}
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
                    {filteredCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.full_path || category.name}
                        </div>
                      </SelectItem>
                    ))}
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

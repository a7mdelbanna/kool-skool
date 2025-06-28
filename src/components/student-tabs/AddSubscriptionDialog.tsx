
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Loader2, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useSubscriptionCreation } from '@/hooks/useSubscriptionCreation';
import TimePicker from '@/components/ui/time-picker';
import SchedulePreview from './SchedulePreview';

interface ScheduleItem {
  day: string;
  time: string;
}

interface AddSubscriptionDialogProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddSubscriptionDialog: React.FC<AddSubscriptionDialogProps> = ({
  studentId,
  open,
  onOpenChange,
  onSuccess
}) => {
  const { toast } = useToast();
  const { createSubscription, isSubmitting } = useSubscriptionCreation(studentId, onSuccess);

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const schoolId = getSchoolId();

  // Fetch school currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ['school-currencies', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase.rpc('get_school_currencies', {
        p_school_id: schoolId
      });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Fetch school accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['school-accounts', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          currencies (
            code,
            symbol
          )
        `)
        .eq('school_id', schoolId)
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const [formData, setFormData] = useState({
    sessionCount: 4,
    durationMonths: 1,
    startDate: undefined as Date | undefined,
    schedule: [] as ScheduleItem[],
    priceMode: 'perSession' as 'perSession' | 'fixedPrice',
    pricePerSession: 0,
    fixedPrice: 0,
    currency: '',
    notes: '',
    status: 'active',
    initialPayment: {
      amount: 0,
      method: 'Cash',
      notes: '',
      accountId: ''
    }
  });

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const paymentMethods = ['Cash', 'Card', 'Bank Transfer', 'Check', 'Online'];

  // Set default currency when currencies are loaded
  useEffect(() => {
    if (currencies.length > 0 && !formData.currency) {
      const defaultCurrency = currencies.find(c => c.is_default) || currencies[0];
      setFormData(prev => ({ ...prev, currency: defaultCurrency.code }));
    }
  }, [currencies, formData.currency]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        sessionCount: 4,
        durationMonths: 1,
        startDate: undefined,
        schedule: [],
        priceMode: 'perSession',
        pricePerSession: 0,
        fixedPrice: 0,
        currency: currencies.length > 0 ? (currencies.find(c => c.is_default) || currencies[0]).code : '',
        notes: '',
        status: 'active',
        initialPayment: {
          amount: 0,
          method: 'Cash',
          notes: '',
          accountId: ''
        }
      });
    }
  }, [open, currencies]);

  const addScheduleItem = () => {
    setFormData({
      ...formData,
      schedule: [...formData.schedule, { day: '', time: '' }]
    });
  };

  const removeScheduleItem = (index: number) => {
    const newSchedule = formData.schedule.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      schedule: newSchedule
    });
  };

  const updateScheduleItem = (index: number, field: 'day' | 'time', value: string) => {
    const newSchedule = [...formData.schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setFormData({
      ...formData,
      schedule: newSchedule
    });
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  const getTotalPrice = () => {
    return formData.priceMode === 'perSession' 
      ? formData.pricePerSession * formData.sessionCount 
      : formData.fixedPrice;
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.startDate || formData.schedule.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in start date and at least one schedule",
        variant: "destructive",
      });
      return;
    }

    // Validate all schedule items are complete
    const incompleteSchedules = formData.schedule.some(s => !s.day || !s.time);
    if (incompleteSchedules) {
      toast({
        title: "Error",
        description: "Please complete all schedule entries or remove incomplete ones",
        variant: "destructive",
      });
      return;
    }

    // Validate account selection if initial payment amount > 0
    if (formData.initialPayment.amount > 0 && !formData.initialPayment.accountId) {
      toast({
        title: "Error",
        description: "Please select an account for the initial payment",
        variant: "destructive",
      });
      return;
    }

    const subscriptionData = {
      ...formData,
      totalPrice: getTotalPrice()
    };

    await createSubscription(subscriptionData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Add Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Count, Duration, and Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sessionCount" className="text-sm font-semibold text-gray-700">Session Count</Label>
                <Input 
                  type="number" 
                  id="sessionCount" 
                  value={formData.sessionCount} 
                  onChange={(e) => setFormData({ ...formData, sessionCount: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="durationMonths" className="text-sm font-semibold text-gray-700">Duration (Months)</Label>
                <Input 
                  type="number" 
                  id="durationMonths" 
                  value={formData.durationMonths} 
                  onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="currency" className="text-sm font-semibold text-gray-700">Currency</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.name} ({currency.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <Label className="text-sm font-semibold text-gray-700">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => setFormData({ ...formData, startDate: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-700">Schedule</Label>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={addScheduleItem}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Schedule
                </Button>
              </div>
              
              {formData.schedule.map((schedule, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-600">Day</Label>
                    <Select 
                      value={schedule.day || ""}
                      onValueChange={(value) => updateScheduleItem(index, 'day', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-gray-600">Time</Label>
                    <TimePicker
                      value={schedule.time}
                      onChange={(value) => updateScheduleItem(index, 'time', value)}
                      placeholder="Select time"
                    />
                  </div>
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeScheduleItem(index)}
                    className="text-red-600 hover:text-red-800 mt-4"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Price Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Price Mode</Label>
                <Select 
                  value={formData.priceMode} 
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    priceMode: value as 'perSession' | 'fixedPrice' 
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select price mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perSession">Per Session</SelectItem>
                    <SelectItem value="fixedPrice">Fixed Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.priceMode === 'perSession' && (
                <div>
                  <Label htmlFor="pricePerSession" className="text-sm font-semibold text-gray-700">
                    Price Per Session ({getCurrencySymbol(formData.currency)})
                  </Label>
                  <Input 
                    type="number" 
                    id="pricePerSession" 
                    value={formData.pricePerSession} 
                    onChange={(e) => setFormData({ ...formData, pricePerSession: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                    step="0.01"
                  />
                  {formData.pricePerSession > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Total: {getCurrencySymbol(formData.currency)} {(formData.pricePerSession * formData.sessionCount).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {formData.priceMode === 'fixedPrice' && (
                <div>
                  <Label htmlFor="fixedPrice" className="text-sm font-semibold text-gray-700">
                    Fixed Price ({getCurrencySymbol(formData.currency)})
                  </Label>
                  <Input 
                    type="number" 
                    id="fixedPrice" 
                    value={formData.fixedPrice} 
                    onChange={(e) => setFormData({ ...formData, fixedPrice: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                    step="0.01"
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <Label className="text-sm font-semibold text-gray-700">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Initial Payment Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Initial Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="initialAmount" className="text-sm font-semibold text-gray-700">
                    Amount ({getCurrencySymbol(formData.currency)})
                  </Label>
                  <Input 
                    type="number" 
                    id="initialAmount" 
                    value={formData.initialPayment.amount} 
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      initialPayment: { 
                        ...formData.initialPayment, 
                        amount: parseFloat(e.target.value) || 0 
                      } 
                    })}
                    className="mt-1"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Payment Method</Label>
                  <Select 
                    value={formData.initialPayment.method} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      initialPayment: { 
                        ...formData.initialPayment, 
                        method: value 
                      } 
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Account</Label>
                  <Select 
                    value={formData.initialPayment.accountId} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      initialPayment: { 
                        ...formData.initialPayment, 
                        accountId: value 
                      } 
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter(account => account.currencies?.code === formData.currency)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.currencies?.symbol})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-4">
                <Label htmlFor="paymentNotes" className="text-sm font-semibold text-gray-700">Payment Notes</Label>
                <Textarea 
                  id="paymentNotes" 
                  placeholder="Add any notes about the initial payment..."
                  value={formData.initialPayment.notes} 
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    initialPayment: { 
                      ...formData.initialPayment, 
                      notes: e.target.value 
                    } 
                  })}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Add any additional notes about this subscription..."
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || formData.schedule.length === 0 || !formData.startDate}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column - Schedule Preview */}
          <div className="lg:col-span-1">
            <SchedulePreview
              schedule={formData.schedule}
              startDate={formData.startDate}
              sessionCount={formData.sessionCount}
              durationMonths={formData.durationMonths}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSubscriptionDialog;

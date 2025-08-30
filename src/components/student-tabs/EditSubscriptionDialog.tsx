import React, { useState, useEffect } from 'react';
import { Calendar, Clock, X, Plus, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Subscription, RpcResponse } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import TimePicker from '@/components/ui/time-picker';
import SchedulePreview from './SchedulePreview';
import { validateTeacherScheduleOverlap } from '@/utils/teacherScheduleValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScheduleItem {
  day: string;
  time: string;
}

interface EditSubscriptionDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditSubscriptionDialog: React.FC<EditSubscriptionDialogProps> = ({
  subscription,
  open,
  onOpenChange,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string>('');
  const [studentTeacherId, setStudentTeacherId] = useState<string>('');

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const getCurrentUserId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.user_id || user.id || user.userId;
  };

  const schoolId = getSchoolId();
  const currentUserId = getCurrentUserId();

  // Fetch student details to get teacher ID
  const { data: studentData } = useQuery({
    queryKey: ['student-details', subscription?.student_id],
    queryFn: async () => {
      if (!subscription?.student_id) return null;
      const { data, error } = await supabase
        .from('students')
        .select('teacher_id')
        .eq('id', subscription.student_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!subscription?.student_id && open,
  });

  useEffect(() => {
    if (studentData?.teacher_id) {
      setStudentTeacherId(studentData.teacher_id);
    }
  }, [studentData]);

  // Utility function to convert 12-hour format to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    if (!time12h || time12h.includes(':') && !time12h.includes('AM') && !time12h.includes('PM')) {
      // Already in 24-hour format
      return time12h;
    }
    
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  // Utility function to convert 24-hour format to 12-hour format for display
  const convertTo12Hour = (time24h: string): string => {
    if (!time24h) return '';
    
    // If already in 12-hour format, return as is
    if (time24h.includes('AM') || time24h.includes('PM')) {
      return time24h;
    }
    
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

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

  // Fetch school accounts using RPC function
  const { data: accounts = [] } = useQuery({
    queryKey: ['school-accounts', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase.rpc('get_school_accounts', {
        p_school_id: schoolId
      });
      if (error) throw error;
      // Filter out archived accounts
      return (data || []).filter((account: any) => !account.is_archived);
    },
    enabled: !!schoolId,
  });

  // Fetch initial payment data
  const { data: initialPaymentData } = useQuery({
    queryKey: ['subscription-initial-payment', subscription?.id],
    queryFn: async () => {
      if (!subscription?.id) return null;
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('type', 'income')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching initial payment:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!subscription?.id && open,
  });

  const [formData, setFormData] = useState({
    sessionCount: '',
    durationMonths: '',
    startDate: undefined as Date | undefined,
    schedule: [] as ScheduleItem[],
    priceMode: 'perSession',
    pricePerSession: '',
    fixedPrice: '',
    currency: '',
    notes: '',
    status: 'active',
    initialPayment: {
      amount: '',
      method: 'Cash',
      notes: '',
      accountId: ''
    }
  });

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const paymentMethods = ['Cash', 'Card', 'Bank Transfer', 'Check', 'Online'];

  // Populate form when subscription changes
  useEffect(() => {
    if (subscription && open) {
      console.log('Populating form with subscription data:', subscription);
      
      // Parse schedule from JSONB
      let parsedSchedule: ScheduleItem[] = [];
      try {
        if (subscription.schedule) {
          if (typeof subscription.schedule === 'string') {
            parsedSchedule = JSON.parse(subscription.schedule);
          } else {
            parsedSchedule = subscription.schedule as ScheduleItem[];
          }
          
          // Ensure consistent time format (convert to 24-hour for internal use)
          parsedSchedule = parsedSchedule.map(item => ({
            ...item,
            time: convertTo24Hour(item.time)
          }));
        }
      } catch (error) {
        console.error('Error parsing schedule:', error);
        parsedSchedule = [];
      }

      setFormData({
        sessionCount: subscription.session_count?.toString() || '',
        durationMonths: subscription.duration_months?.toString() || '',
        startDate: subscription.start_date ? new Date(subscription.start_date) : undefined,
        schedule: parsedSchedule,
        priceMode: subscription.price_mode,
        pricePerSession: subscription.price_per_session?.toString() || '',
        fixedPrice: subscription.fixed_price?.toString() || '',
        currency: subscription.currency,
        notes: subscription.notes || '',
        status: subscription.status,
        initialPayment: {
          amount: initialPaymentData?.amount?.toString() || '',
          method: initialPaymentData?.payment_method || 'Cash',
          notes: initialPaymentData?.notes || '',
          accountId: initialPaymentData?.to_account_id || ''
        }
      });
      
      setValidationError('');
      setConflictMessage('');
      setShowConflictDialog(false);
    }
  }, [subscription, open, initialPaymentData]);

  // Set default currency when currencies are loaded
  useEffect(() => {
    if (currencies.length > 0 && !formData.currency && !subscription) {
      const defaultCurrency = currencies.find(c => c.is_default) || currencies[0];
      setFormData(prev => ({ ...prev, currency: defaultCurrency.code }));
    }
  }, [currencies, formData.currency, subscription]);

  // Clear validation error when form fields change
  useEffect(() => {
    if (validationError) {
      setValidationError('');
    }
  }, [formData.startDate, formData.schedule]);

  // Validate teacher schedule when schedule or date changes
  useEffect(() => {
    const validateSchedule = async () => {
      if (!formData.startDate || !formData.schedule.length || !studentTeacherId || !subscription?.id) {
        return;
      }

      // Check if all schedule items are complete
      const incompleteSchedules = formData.schedule.some(s => !s.day || !s.time);
      if (incompleteSchedules) {
        return;
      }

      setIsValidating(true);
      setValidationError('');

      try {
        const dateStr = format(formData.startDate, 'yyyy-MM-dd');
        
        // Validate each schedule item
        for (const scheduleItem of formData.schedule) {
          const result = await validateTeacherScheduleOverlap({
            teacherId: studentTeacherId,
            date: dateStr,
            startTime: scheduleItem.time,
            durationMinutes: 60, // Default session duration
            excludeSessionId: subscription.id // Exclude current subscription's sessions
          });

          if (result.hasConflict && result.conflictMessage) {
            setValidationError(result.conflictMessage);
            break;
          }
        }
      } catch (error) {
        console.error('Error validating schedule:', error);
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation to avoid too many API calls
    const timeoutId = setTimeout(validateSchedule, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.startDate, formData.schedule, studentTeacherId, subscription?.id]);

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
    if (field === 'time') {
      // Convert to 24-hour format for consistent internal storage
      newSchedule[index] = { ...newSchedule[index], [field]: convertTo24Hour(value) };
    } else {
      newSchedule[index] = { ...newSchedule[index], [field]: value };
    }
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
    const pricePerSession = parseFloat(formData.pricePerSession) || 0;
    const sessionCount = parseInt(formData.sessionCount) || 0;
    const fixedPrice = parseFloat(formData.fixedPrice) || 0;
    return formData.priceMode === 'perSession' 
      ? pricePerSession * sessionCount 
      : fixedPrice;
  };

  const handleSubmit = async () => {
    if (!subscription || !currentUserId || !schoolId) {
      toast({
        title: "Error",
        description: "Missing required data",
        variant: "destructive",
      });
      return;
    }

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

    // Final validation before submission
    if (studentTeacherId) {
      setIsValidating(true);
      
      try {
        const dateStr = format(formData.startDate, 'yyyy-MM-dd');
        
        for (const scheduleItem of formData.schedule) {
          const result = await validateTeacherScheduleOverlap({
            teacherId: studentTeacherId,
            date: dateStr,
            startTime: scheduleItem.time,
            durationMinutes: 60,
            excludeSessionId: subscription.id
          });

          if (result.hasConflict && result.conflictMessage) {
            setConflictMessage(result.conflictMessage);
            setShowConflictDialog(true);
            setIsValidating(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error validating schedule:', error);
        toast({
          title: "Error",
          description: "Failed to validate schedule. Please try again.",
          variant: "destructive",
        });
        setIsValidating(false);
        return;
      }
      
      setIsValidating(false);
    }

    try {
      setLoading(true);
      
      // Prepare schedule data - convert times back to 12-hour format for database consistency
      const scheduleForDatabase = formData.schedule.map(item => ({
        day: item.day,
        time: convertTo12Hour(item.time)
      }));
      
      console.log('Updating subscription with data:', {
        subscription_id: subscription.id,
        ...formData,
        schedule: scheduleForDatabase,
        total_price: getTotalPrice()
      });

      // Pass the schedule as a JSONB array directly, not as a JSON string
      const { data, error } = await supabase.rpc('update_subscription_with_related_data', {
        p_subscription_id: subscription.id,
        p_session_count: parseInt(formData.sessionCount) || 0,
        p_duration_months: parseInt(formData.durationMonths) || 0,
        p_start_date: formData.startDate.toISOString().split('T')[0],
        p_schedule: scheduleForDatabase, // Pass as array, not JSON string
        p_price_mode: formData.priceMode,
        p_price_per_session: formData.priceMode === 'perSession' ? parseFloat(formData.pricePerSession) || 0 : null,
        p_fixed_price: formData.priceMode === 'fixedPrice' ? parseFloat(formData.fixedPrice) || 0 : null,
        p_total_price: getTotalPrice(),
        p_currency: formData.currency,
        p_notes: formData.notes,
        p_status: formData.status,
        p_current_user_id: currentUserId,
        p_current_school_id: schoolId
      });

      if (error) {
        console.error('Error updating subscription:', error);
        throw error;
      }

      console.log('Subscription update result:', data);

      const response = data as RpcResponse;
      if (response && !response.success) {
        throw new Error(response.message || 'Failed to update subscription');
      }

      toast({
        title: "Success",
        description: response?.message || "Subscription updated successfully!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Edit Subscription
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            {/* Main Form - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Session Count, Duration, and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="sessionCount" className="text-sm font-semibold text-gray-700">Session Count</Label>
                  <Input 
                    type="number" 
                    id="sessionCount" 
                    value={formData.sessionCount} 
                    onChange={(e) => setFormData({ ...formData, sessionCount: e.target.value })}
                    placeholder="4"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="durationMonths" className="text-sm font-semibold text-gray-700">Duration (Months)</Label>
                  <Input 
                    type="number" 
                    id="durationMonths" 
                    value={formData.durationMonths} 
                    onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                    placeholder="1"
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
                        onChange={(time) => updateScheduleItem(index, 'time', time)}
                        placeholder="Select time"
                      />
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeScheduleItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Validation Error Alert */}
              {validationError && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-800 font-medium">
                    {validationError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Validation Loading */}
              {isValidating && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="text-blue-800">
                    Checking teacher availability...
                  </AlertDescription>
                </Alert>
              )}

              {/* Price Section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Price Mode</Label>
                  <Select value={formData.priceMode} onValueChange={(value) => setFormData({ ...formData, priceMode: value })}>
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
                      onChange={(e) => setFormData({ ...formData, pricePerSession: e.target.value })}
                      placeholder="0.00"
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
                      onChange={(e) => setFormData({ ...formData, fixedPrice: e.target.value })}
                      placeholder="0.00"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          amount: e.target.value 
                        } 
                      })}
                      placeholder="0.00"
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
                </div>
                
                {formData.initialPayment.amount > 0 && (
                  <div className="mt-4">
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
                          .filter(account => account.currency_code === formData.currency)
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.currency_symbol})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
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
                  disabled={loading || isValidating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || isValidating || !!validationError || formData.schedule.length === 0 || !formData.startDate}
                  className={validationError ? "opacity-50 cursor-not-allowed min-w-[120px]" : "min-w-[120px]"}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Update
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Schedule Preview - Right Side */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <SchedulePreview
                  schedule={formData.schedule.map(item => ({
                    ...item,
                    time: convertTo12Hour(item.time) // Convert back to 12-hour for display
                  }))}
                  startDate={formData.startDate}
                  sessionCount={formData.sessionCount}
                  durationMonths={formData.durationMonths}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Conflict Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="sm:max-w-[600px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Teacher Schedule Conflict
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left whitespace-pre-wrap text-gray-700 leading-relaxed">
              <div className="mb-4">
                <strong>Unable to update subscription due to a scheduling conflict.</strong>
              </div>
              <div className="mb-4">
                {conflictMessage}
              </div>
              <div className="text-sm text-gray-600">
                <strong>What you can do:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Choose a different time slot for your session</li>
                  <li>Select an alternative day from your schedule</li>
                  <li>Contact the teacher to discuss available time slots</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel onClick={() => setShowConflictDialog(false)}>
              Choose Different Time
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => setShowConflictDialog(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Got It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditSubscriptionDialog;

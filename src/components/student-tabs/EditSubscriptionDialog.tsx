import React, { useState, useEffect } from 'react';
import { Calendar, Clock, X, Plus, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
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

  // Session preservation confirmation dialog states
  const [showSessionConfirmDialog, setShowSessionConfirmDialog] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);
  const [changesSummary, setChangesSummary] = useState<string[]>([]);
  const [suggestPreserve, setSuggestPreserve] = useState(true);

  // Get user's timezone (Cairo)
  const getUserTimezone = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.timezone || 'Africa/Cairo';
      } catch {
        return 'Africa/Cairo';
      }
    }
    return 'Africa/Cairo';
  };

  const userTimezone = getUserTimezone();

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const getUserData = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    return JSON.parse(userData);
  };

  const userData = getUserData();
  const schoolId = getSchoolId();
  const currentUserId = userData?.user_id || userData?.id || userData?.userId;
  const isAdmin = userData?.role === 'admin';

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

  // Fetch first session for this subscription to get the start date if needed
  const { data: firstSessionData } = useQuery({
    queryKey: ['subscription-first-session', subscription?.id],
    queryFn: async () => {
      if (!subscription?.id) return null;
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select('scheduled_date')
        .eq('subscription_id', subscription.id)
        .order('scheduled_date', { ascending: true })
        .limit(1);
      if (error) {
        console.error('Error fetching subscription first session:', error);
        return null;
      }
      return data?.[0] || null;
    },
    enabled: !!subscription?.id && open && !subscription?.start_date
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

  // Fetch initial payment data - simplified query to avoid index requirement
  const { data: initialPaymentData } = useQuery({
    queryKey: ['subscription-initial-payment', subscription?.id],
    queryFn: async () => {
      if (!subscription?.id) return null;
      
      // First get all transactions for this subscription
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('subscription_id', subscription.id);
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching initial payment:', error);
        return null;
      }
      
      // Filter for income type and sort by created_at in JavaScript
      const incomeTransactions = (transactions || [])
        .filter(t => t.type === 'income')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      return incomeTransactions[0] || null;
    },
    enabled: !!subscription?.id && open,
  });

  const [formData, setFormData] = useState({
    sessionCount: '',
    durationMonths: '',
    sessionDuration: '60', // Default to 60 minutes
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
        sessionDuration: subscription.session_duration_minutes?.toString() || '60',
        startDate: (() => {
          // Use subscription start_date if available, otherwise use first session date (for renewed subscriptions)
          const dateToUse = subscription.start_date || firstSessionData?.scheduled_date;

          if (!dateToUse) {
            console.log('No date available for subscription');
            return undefined;
          }

          try {
            // Handle different date formats
            let date: Date;

            // Check if it's in YYYY-MM-DD format
            if (typeof dateToUse === 'string' && dateToUse.includes('-')) {
              const datePart = dateToUse.split('T')[0]; // Handle both YYYY-MM-DD and ISO format
              const [year, month, day] = datePart.split('-').map(Number);
              date = new Date(year, month - 1, day);
            } else {
              // Try parsing as a regular date string
              date = new Date(dateToUse);
            }

            if (!isNaN(date.getTime())) {
              console.log(`Using ${subscription.start_date ? 'subscription start_date' : 'first session date'}: ${dateToUse} -> parsed as: ${date}`);
              return date;
            } else {
              console.error('Invalid date:', dateToUse);
              return undefined;
            }
          } catch (error) {
            console.error('Error parsing date:', dateToUse, error);
            return undefined;
          }
        })(),
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
  }, [subscription, open, initialPaymentData, firstSessionData]);

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
        // Validate startDate exists and is valid
        if (!formData.startDate || isNaN(formData.startDate.getTime())) {
          setValidationError('Please select a valid start date');
          setIsValidating(false);
          return;
        }

        const dateStr = format(formData.startDate, 'yyyy-MM-dd');
        
        // Validate each schedule item
        for (const scheduleItem of formData.schedule) {
          const result = await validateTeacherScheduleOverlap({
            teacherId: studentTeacherId,
            date: dateStr,
            startTime: scheduleItem.time,
            durationMinutes: parseInt(formData.sessionDuration) || 60,
            excludeSessionId: subscription.id // Exclude current subscription's sessions
          }, isAdmin);

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

  // Detect what changed between original subscription and form data
  const detectChanges = () => {
    if (!subscription) return { changes: [], majorChange: false };

    const changes: string[] = [];
    let majorChange = false;

    // Check schedule days change (major)
    const originalDays = subscription.schedule?.map(s => s.day).sort() || [];
    const newDays = formData.schedule.map(s => s.day).sort();
    const daysChanged = JSON.stringify(originalDays) !== JSON.stringify(newDays);

    if (daysChanged) {
      changes.push(`Schedule days changed from [${originalDays.join(', ')}] to [${newDays.join(', ')}]`);
      majorChange = true;
    }

    // Check schedule times change (minor)
    const originalTimes = subscription.schedule?.map(s => `${s.day}:${s.time}`).sort() || [];
    const newTimes = formData.schedule.map(s => `${s.day}:${s.time}`).sort();
    const timesChanged = !daysChanged && JSON.stringify(originalTimes) !== JSON.stringify(newTimes);

    if (timesChanged) {
      changes.push('Session times updated');
    }

    // Check session count change (moderate)
    const countChanged = subscription.sessionCount !== parseInt(formData.sessionCount);
    if (countChanged) {
      changes.push(`Session count changed from ${subscription.sessionCount} to ${formData.sessionCount}`);
      majorChange = true;
    }

    // Check price changes (minor)
    if (subscription.priceMode !== formData.priceMode) {
      changes.push('Pricing mode changed');
    }
    if (subscription.pricePerSession !== parseFloat(formData.pricePerSession || '0')) {
      changes.push(`Price per session changed from ${subscription.pricePerSession} to ${formData.pricePerSession}`);
    }
    if (subscription.fixedPrice !== parseFloat(formData.fixedPrice || '0')) {
      changes.push('Fixed price changed');
    }

    // Check duration (moderate)
    if (subscription.sessionDurationMinutes !== parseInt(formData.sessionDuration)) {
      changes.push(`Session duration changed from ${subscription.sessionDurationMinutes} to ${formData.sessionDuration} minutes`);
    }

    return { changes, majorChange };
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

    // Validate price is set
    const totalPrice = getTotalPrice();
    if (totalPrice <= 0) {
      toast({
        title: "Error",
        description: formData.priceMode === 'perSession' 
          ? "Please enter a price per session" 
          : "Please enter a fixed price for the subscription",
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
        // Validate startDate exists and is valid
        if (!formData.startDate || isNaN(formData.startDate.getTime())) {
          toast.error('Please select a valid start date');
          setIsValidating(false);
          return;
        }

        const dateStr = format(formData.startDate, 'yyyy-MM-dd');
        
        for (const scheduleItem of formData.schedule) {
          const result = await validateTeacherScheduleOverlap({
            teacherId: studentTeacherId,
            date: dateStr,
            startTime: scheduleItem.time,
            durationMinutes: parseInt(formData.sessionDuration) || 60,
            excludeSessionId: subscription.id
          }, isAdmin);

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

    // Detect changes and show confirmation dialog
    const { changes, majorChange } = detectChanges();

    if (changes.length > 0) {
      console.log('📊 Changes detected:', changes);
      console.log('🔍 Major change:', majorChange);

      // Prepare the update data to be executed later
      const scheduleForDatabase = formData.schedule.map(item => ({
        day: item.day,
        time: item.time
      }));

      const updateData = {
        p_subscription_id: subscription.id,
        p_session_count: parseInt(formData.sessionCount) || 0,
        p_duration_months: parseInt(formData.durationMonths) || 0,
        p_session_duration_minutes: parseInt(formData.sessionDuration) || 60,
        p_start_date: (() => {
          const date = formData.startDate;
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        })(),
        p_schedule: scheduleForDatabase,
        p_price_mode: formData.priceMode,
        p_price_per_session: formData.priceMode === 'perSession' ? parseFloat(formData.pricePerSession) || 0 : null,
        p_fixed_price: formData.priceMode === 'fixedPrice' ? parseFloat(formData.fixedPrice) || 0 : null,
        p_total_price: getTotalPrice(),
        p_currency: formData.currency,
        p_notes: formData.notes,
        p_status: formData.status,
        p_current_user_id: currentUserId,
        p_current_school_id: schoolId
      };

      // Store pending data and show confirmation dialog
      setPendingUpdateData(updateData);
      setChangesSummary(changes);
      setSuggestPreserve(!majorChange); // Suggest preserve if no major changes
      setShowSessionConfirmDialog(true);
      return;
    }

    // No changes detected, proceed with update (preserve by default)
    await performUpdate(true);
  };

  // Function to actually perform the update with preserve_sessions parameter
  const performUpdate = async (preserveSessions: boolean) => {
    try {
      setLoading(true);
      setShowSessionConfirmDialog(false);

      const updateData = pendingUpdateData || {
        p_subscription_id: subscription!.id,
        p_session_count: parseInt(formData.sessionCount) || 0,
        p_duration_months: parseInt(formData.durationMonths) || 0,
        p_session_duration_minutes: parseInt(formData.sessionDuration) || 60,
        p_start_date: (() => {
          const date = formData.startDate;
          return `${date!.getFullYear()}-${String(date!.getMonth() + 1).padStart(2, '0')}-${String(date!.getDate()).padStart(2, '0')}`;
        })(),
        p_schedule: formData.schedule.map(item => ({ day: item.day, time: item.time })),
        p_price_mode: formData.priceMode,
        p_price_per_session: formData.priceMode === 'perSession' ? parseFloat(formData.pricePerSession) || 0 : null,
        p_fixed_price: formData.priceMode === 'fixedPrice' ? parseFloat(formData.fixedPrice) || 0 : null,
        p_total_price: getTotalPrice(),
        p_currency: formData.currency,
        p_notes: formData.notes,
        p_status: formData.status,
        p_current_user_id: currentUserId,
        p_current_school_id: schoolId
      };

      console.log('📤 Updating subscription with preserve_sessions:', preserveSessions);

      const { data, error} = await supabase.rpc('update_subscription_with_related_data', {
        ...updateData,
        p_preserve_sessions: preserveSessions
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="h-5 w-5 text-primary" />
              Edit Subscription
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            {/* Main Form - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Session Count, Duration, and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="sessionCount" className="text-sm font-semibold text-muted-foreground">Session Count</Label>
                  <Input
                    type="number"
                    id="sessionCount"
                    value={formData.sessionCount}
                    onChange={(e) => setFormData({ ...formData, sessionCount: e.target.value })}
                    placeholder="4"
                    className="mt-1 bg-background border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="durationMonths" className="text-sm font-semibold text-muted-foreground">Duration (Months)</Label>
                  <Input
                    type="number"
                    id="durationMonths"
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                    placeholder="1"
                    className="mt-1 bg-background border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="sessionDuration" className="text-sm font-semibold text-muted-foreground">Session Duration</Label>
                  <Select 
                    value={formData.sessionDuration} 
                    onValueChange={(value) => setFormData({ ...formData, sessionDuration: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="40">40 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="50">50 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="80">80 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="100">100 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency" className="text-sm font-semibold text-muted-foreground">Currency</Label>
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
                <Label className="text-sm font-semibold text-muted-foreground">Start Date</Label>
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
                      {formData.startDate && !isNaN(formData.startDate.getTime()) ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
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
                  <Label className="text-sm font-semibold text-foreground">Schedule</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addScheduleItem}
                    className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                  >
                    <Plus className="h-4 w-4" />
                    Add Schedule
                  </Button>
                </div>

                {formData.schedule.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No schedule items added yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Add Schedule" to get started</p>
                  </div>
                ) : (
                  formData.schedule.map((schedule, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg shadow-sm">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Day</Label>
                        <Select
                          value={schedule.day || ""}
                          onValueChange={(value) => updateScheduleItem(index, 'day', value)}
                        >
                          <SelectTrigger className="bg-background border-input hover:bg-accent hover:text-accent-foreground">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {daysOfWeek.map((day) => (
                              <SelectItem key={day} value={day}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Time</Label>
                        <TimePicker
                          value={schedule.time}
                          onChange={(time) => updateScheduleItem(index, 'time', time)}
                          placeholder="Select time"
                          className="bg-background border-input hover:bg-accent hover:text-accent-foreground"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeScheduleItem(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Validation Error Alert */}
              {validationError && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="font-medium">
                    {validationError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Validation Loading */}
              {isValidating && (
                <Alert className="border-blue-500/50 bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-200">
                    Checking teacher availability...
                  </AlertDescription>
                </Alert>
              )}

              {/* Price Section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Price Mode</Label>
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
                    <Label htmlFor="pricePerSession" className="text-sm font-semibold text-muted-foreground">
                      Price Per Session ({getCurrencySymbol(formData.currency)})
                    </Label>
                    <Input
                      type="number"
                      id="pricePerSession"
                      value={formData.pricePerSession}
                      onChange={(e) => setFormData({ ...formData, pricePerSession: e.target.value })}
                      placeholder="0.00"
                      className="mt-1 bg-background border-border"
                      step="0.01"
                    />
                    {formData.pricePerSession > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Total: {getCurrencySymbol(formData.currency)} {(formData.pricePerSession * formData.sessionCount).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {formData.priceMode === 'fixedPrice' && (
                  <div>
                    <Label htmlFor="fixedPrice" className="text-sm font-semibold text-muted-foreground">
                      Fixed Price ({getCurrencySymbol(formData.currency)})
                    </Label>
                    <Input
                      type="number"
                      id="fixedPrice"
                      value={formData.fixedPrice}
                      onChange={(e) => setFormData({ ...formData, fixedPrice: e.target.value })}
                      placeholder="0.00"
                      className="mt-1 bg-background border-border"
                      step="0.01"
                    />
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
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
                <h3 className="text-lg font-semibold text-foreground mb-4">Initial Payment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="initialAmount" className="text-sm font-semibold text-muted-foreground">
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
                      className="mt-1 bg-background border-border"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Payment Method</Label>
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
                    <Label className="text-sm font-semibold text-muted-foreground">Account</Label>
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
                  <Label htmlFor="paymentNotes" className="text-sm font-semibold text-muted-foreground">Payment Notes</Label>
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
                <Label htmlFor="notes" className="text-sm font-semibold text-muted-foreground">Notes</Label>
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
                  sessionDuration={formData.sessionDuration}
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

      {/* Session Preservation Confirmation Dialog */}
      <AlertDialog open={showSessionConfirmDialog} onOpenChange={setShowSessionConfirmDialog}>
        <AlertDialogContent className="sm:max-w-[650px] bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground text-lg">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Update Subscription - Session Actions
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-foreground font-medium text-base">
                  You've made changes to this subscription. How should we handle existing session actions?
                </p>

                {changesSummary.length > 0 && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                    <p className="font-semibold text-sm text-foreground mb-2">Changes detected:</p>
                    <ul className="text-sm space-y-1.5 ml-4 list-disc text-foreground/80">
                      {changesSummary.map((change, index) => (
                        <li key={index} className="leading-relaxed">{change}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <div className={cn(
                    "border-2 rounded-lg p-4 transition-all",
                    suggestPreserve
                      ? "border-success bg-success/10"
                      : "border-border bg-muted/30 hover:border-success/50"
                  )}>
                    <div className="flex items-start gap-3">
                      <CheckCircle className={cn(
                        "h-5 w-5 mt-0.5 flex-shrink-0",
                        suggestPreserve ? "text-success" : "text-muted-foreground"
                      )} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-base mb-1.5">Keep Session Actions</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Preserve attendance records, cancellations, and completion status for existing sessions.
                          Updates times and dates while keeping all session history intact.
                        </p>
                        {suggestPreserve && (
                          <p className="text-sm text-success font-semibold mt-2.5 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Recommended for your changes
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "border-2 rounded-lg p-4 transition-all",
                    !suggestPreserve
                      ? "border-destructive bg-destructive/10"
                      : "border-border bg-muted/30 hover:border-destructive/50"
                  )}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={cn(
                        "h-5 w-5 mt-0.5 flex-shrink-0",
                        !suggestPreserve ? "text-destructive" : "text-muted-foreground"
                      )} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-base mb-1.5">Reset All Sessions</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Delete all existing sessions and create new ones from scratch.
                          All attendance records and session history will be lost.
                        </p>
                        {!suggestPreserve && (
                          <p className="text-sm text-destructive font-semibold mt-2.5 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Recommended due to schedule day changes
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 mt-2">
            <AlertDialogCancel
              onClick={() => {
                setShowSessionConfirmDialog(false);
                setPendingUpdateData(null);
              }}
              className="text-foreground"
            >
              Cancel Update
            </AlertDialogCancel>
            <Button
              onClick={() => performUpdate(true)}
              disabled={loading}
              className="bg-success hover:bg-success/90 text-white font-medium"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Keep Actions
            </Button>
            <Button
              onClick={() => performUpdate(false)}
              disabled={loading}
              variant="destructive"
              className="font-medium"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reset Sessions
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditSubscriptionDialog;

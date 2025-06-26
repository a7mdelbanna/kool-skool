import React, { useState, useEffect } from "react";
import { Calendar, Clock, DollarSign, FileText, Trash2, CheckCircle, AlertTriangle, Loader2, Plus, X, CalendarIcon, CreditCard, Receipt } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionCreation } from "@/hooks/useSubscriptionCreation";
import { Student } from "@/components/StudentCard";
import { 
  getStudentSubscriptions, 
  addStudentSubscription, 
  deleteStudentSubscription 
} from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SubscriptionsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
  isViewMode?: boolean;
}

interface DatabaseSubscription {
  id: string;
  student_id: string;
  session_count: number;
  duration_months: number;
  start_date: string;
  schedule: any;
  price_mode: string;
  price_per_session: number | null;
  fixed_price: number | null;
  total_price: number;
  currency: string;
  notes: string | null;
  status: string;
  created_at: string;
}

interface ScheduleItem {
  day: string;
  time: string;
}

// Modern Time Picker Component
const ModernTimePicker = ({ value, onChange }: { value: string; onChange: (time: string) => void }) => {
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("AM");

  // Parse existing time value
  useEffect(() => {
    if (value) {
      const [time, meridiem] = value.split(' ');
      if (time && meridiem) {
        const [h, m] = time.split(':');
        setHour(h.padStart(2, '0'));
        setMinute(m.padStart(2, '0'));
        setPeriod(meridiem);
      } else if (time) {
        // Handle 24-hour format
        const [h, m] = time.split(':');
        const hourNum = parseInt(h);
        const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
        const displayPeriod = hourNum >= 12 ? 'PM' : 'AM';
        setHour(displayHour.toString().padStart(2, '0'));
        setMinute(m.padStart(2, '0'));
        setPeriod(displayPeriod);
      }
    }
  }, [value]);

  // Update parent when time changes
  useEffect(() => {
    const timeString = `${hour}:${minute} ${period}`;
    onChange(timeString);
  }, [hour, minute, period, onChange]);

  const hours = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    return h.toString().padStart(2, '0');
  });

  const minutes = Array.from({ length: 60 }, (_, i) => {
    return i.toString().padStart(2, '0');
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || "Select time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="text-sm font-medium text-center">Select Time</div>
          <div className="flex items-center justify-center space-x-2">
            {/* Hour Selector */}
            <div className="flex flex-col items-center">
              <Label className="text-xs text-muted-foreground mb-1">Hour</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="w-16 h-12 text-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {hours.map((h) => (
                    <SelectItem key={h} value={h} className="text-center">
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-2xl font-bold text-muted-foreground mt-6">:</div>

            {/* Minute Selector */}
            <div className="flex flex-col items-center">
              <Label className="text-xs text-muted-foreground mb-1">Min</Label>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="w-16 h-12 text-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {minutes.filter((_, i) => i % 5 === 0).map((m) => (
                    <SelectItem key={m} value={m} className="text-center">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AM/PM Selector */}
            <div className="flex flex-col items-center">
              <Label className="text-xs text-muted-foreground mb-1">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-16 h-12 text-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM" className="text-center">AM</SelectItem>
                  <SelectItem value="PM" className="text-center">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Quick Time Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "9:00 AM", value: "09:00 AM" },
                { label: "10:00 AM", value: "10:00 AM" },
                { label: "2:00 PM", value: "02:00 PM" },
                { label: "3:00 PM", value: "03:00 PM" },
                { label: "4:00 PM", value: "04:00 PM" },
                { label: "5:00 PM", value: "05:00 PM" },
              ].map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const [time, meridiem] = preset.value.split(' ');
                    const [h, m] = time.split(':');
                    setHour(h);
                    setMinute(m);
                    setPeriod(meridiem);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false 
}) => {
  const [subscriptions, setSubscriptions] = useState<DatabaseSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isCreating, preventRapidCalls } = useSubscriptionCreation();
  
  // Enhanced form state with Date object for better date handling
  const [formData, setFormData] = useState({
    sessionCount: 4,
    durationMonths: 1,
    startDate: undefined as Date | undefined,
    schedule: [] as ScheduleItem[],
    priceMode: 'perSession',
    pricePerSession: 0,
    fixedPrice: 0,
    currency: 'USD',
    notes: '',
    // New payment fields
    initialPaymentAmount: 0,
    paymentMethod: 'Cash',
    paymentNotes: ''
  });
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<string | null>(null);

  // Enhanced currency options with proper symbols and codes
  const currencies = [
    { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { value: 'EUR', label: 'Euro (€)', symbol: '€' },
    { value: 'RUB', label: 'Russian Ruble (₽)', symbol: '₽' },
    { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
    { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
    { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
  ];

  const paymentMethods = ["Cash", "Credit Card", "Bank Transfer", "PayPal", "Other"];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  // Load subscriptions when component mounts or studentData changes
  useEffect(() => {
    if (studentData.id) {
      loadSubscriptions();
    }
  }, [studentData.id]);

  const loadSubscriptions = async () => {
    if (!studentData.id) return;
    
    try {
      setLoading(true);
      console.log('🔄 Loading subscriptions for student:', studentData.id);
      const data = await getStudentSubscriptions(studentData.id);
      console.log('📊 Loaded subscriptions:', data);
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error loading subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const calculateIntelligentSessionDistribution = () => {
    if (formData.schedule.length === 0 || formData.sessionCount === 0 || !formData.startDate) {
      return [];
    }

    const validSchedules = formData.schedule.filter(s => s.day && s.time);
    if (validSchedules.length === 0) return [];

    // Sort schedules by day of week
    const sortedSchedules = [...validSchedules].sort((a, b) => {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    });

    const startDate = new Date(formData.startDate);
    const sessions: Array<{
      sessionNumber: number;
      day: string;
      time: string;
      date: string;
    }> = [];

    let currentDate = new Date(startDate);
    let sessionsCreated = 0;

    while (sessionsCreated < formData.sessionCount) {
      // Try each scheduled day in order
      for (const schedule of sortedSchedules) {
        if (sessionsCreated >= formData.sessionCount) break;

        // Find next occurrence of this day
        const targetDayIndex = daysOfWeek.indexOf(schedule.day);
        const currentDayIndex = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1; // Convert Sunday=0 to Sunday=6
        
        let daysToAdd = targetDayIndex - currentDayIndex;
        if (daysToAdd < 0) {
          daysToAdd += 7; // Move to next week
        }

        const sessionDate = addDays(currentDate, daysToAdd);
        
        // Only add if on or after start date
        if (sessionDate >= startDate) {
          sessions.push({
            sessionNumber: sessionsCreated + 1,
            day: schedule.day,
            time: schedule.time,
            date: format(sessionDate, 'MMM dd, yyyy')
          });
          
          sessionsCreated++;
          // Move current date to the day after this session
          currentDate = addDays(sessionDate, 1);
        } else {
          // If before start date, just move current date forward
          currentDate = addDays(currentDate, 1);
        }
      }
    }

    return sessions;
  };

  const intelligentSessionDistribution = calculateIntelligentSessionDistribution();

  const getTotalPrice = () => {
    return formData.priceMode === 'perSession' 
      ? formData.pricePerSession * formData.sessionCount 
      : formData.fixedPrice;
  };

  const handleSubmit = preventRapidCalls(async () => {
    if (!studentData.id) {
      toast({
        title: "Error",
        description: "Student ID is required",
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

    // Validate initial payment amount
    if (formData.initialPaymentAmount < 0) {
      toast({
        title: "Error",
        description: "Initial payment amount cannot be negative",
        variant: "destructive",
      });
      return;
    }

    const totalPrice = getTotalPrice();
    if (formData.initialPaymentAmount > totalPrice) {
      toast({
        title: "Error",
        description: "Initial payment amount cannot exceed total subscription price",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      console.log('🚀 SUBMITTING ENHANCED SUBSCRIPTION WITH INITIAL PAYMENT');
      
      const subscriptionData = {
        student_id: studentData.id,
        session_count: formData.sessionCount,
        duration_months: formData.durationMonths,
        start_date: format(formData.startDate, 'yyyy-MM-dd'),
        schedule: formData.schedule,
        price_mode: formData.priceMode,
        price_per_session: formData.priceMode === 'perSession' ? formData.pricePerSession : null,
        fixed_price: formData.priceMode === 'fixed' ? formData.fixedPrice : null,
        total_price: totalPrice,
        currency: formData.currency,
        notes: formData.notes,
        status: 'active',
        // Initial payment data
        initial_payment_amount: formData.initialPaymentAmount,
        payment_method: formData.paymentMethod,
        payment_notes: formData.paymentNotes
      };

      console.log('📝 Enhanced subscription data with initial payment:', subscriptionData);
      
      await addStudentSubscription(subscriptionData);
      
      toast({
        title: "Success",
        description: `Subscription created successfully with ${formData.initialPaymentAmount > 0 ? `initial payment of ${getCurrencySymbol(formData.currency)}${formData.initialPaymentAmount}` : 'no initial payment'}`,
      });
      
      // Reset form
      setFormData({
        sessionCount: 4,
        durationMonths: 1,
        startDate: undefined,
        schedule: [],
        priceMode: 'perSession',
        pricePerSession: 0,
        fixedPrice: 0,
        currency: 'USD',
        notes: '',
        initialPaymentAmount: 0,
        paymentMethod: 'Cash',
        paymentNotes: ''
      });
      
      // Reload subscriptions
      await loadSubscriptions();
      
    } catch (error) {
      console.error('❌ Error creating enhanced subscription:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create subscription",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  });

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!subscriptionId) {
      console.error('❌ No subscription ID provided for deletion');
      return;
    }

    try {
      console.log('🗑️ SIMPLIFIED: Starting subscription deletion for ID:', subscriptionId);
      setDeletingSubscriptionId(subscriptionId);
      
      // Call the enhanced delete function (no optimistic updates)
      console.log('🗑️ Calling enhanced deleteStudentSubscription...');
      await deleteStudentSubscription(subscriptionId);
      
      console.log('✅ Subscription deleted successfully from database');
      
      // Show success message
      toast({
        title: "Success",
        description: "Subscription deleted successfully",
      });
      
      // Reload subscriptions from database
      console.log('🔄 Reloading subscriptions after successful deletion...');
      await loadSubscriptions();
      
    } catch (error) {
      console.error('❌ Error deleting subscription:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete subscription",
        variant: "destructive",
      });
    } finally {
      setDeletingSubscriptionId(null);
      setDeleteDialogOpen(false);
      setSubscriptionToDelete(null);
    }
  };

  const handleOpenDeleteDialog = (subscriptionId: string) => {
    console.log('🗑️ Opening delete dialog for subscription:', subscriptionId);
    setSubscriptionToDelete(subscriptionId);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM dd, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.value === currencyCode);
    return currency?.symbol || currencyCode;
  };

  return (
    <div className="space-y-6">
      {!isViewMode && (
        <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Calendar className="h-5 w-5" />
              Create New Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Session Count and Duration */}
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
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Modern Date Picker */}
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
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => setFormData({ ...formData, startDate: date })}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
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
                      value={schedule.day}
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
                    <ModernTimePicker 
                      value={schedule.time}
                      onChange={(time) => updateScheduleItem(index, 'time', time)}
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

              {formData.schedule.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No schedules added yet. Click "Add Schedule" to begin.</p>
                </div>
              )}
            </div>

            {/* Intelligent Session Distribution Preview */}
            {intelligentSessionDistribution.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Smart Session Schedule Preview
                </h4>
                <p className="text-sm text-green-700 mb-3">
                  Sessions will be distributed intelligently across your selected days, starting from the first available slot:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {intelligentSessionDistribution.map((session, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 text-sm border border-green-100">
                      <div className="font-medium text-green-800">
                        Session {session.sessionNumber}
                      </div>
                      <div className="text-green-600">
                        {session.day}, {session.date}
                      </div>
                      <div className="text-green-500 text-xs">
                        at {session.time}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
                  <strong>Scheduling Logic:</strong> Sessions rotate through selected days in weekly cycles, 
                  ensuring even distribution and natural progression from your start date.
                </div>
              </div>
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
                    <SelectItem value="fixed">Fixed Price</SelectItem>
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
                  />
                  {formData.pricePerSession > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Total: {getCurrencySymbol(formData.currency)} {(formData.pricePerSession * formData.sessionCount).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {formData.priceMode === 'fixed' && (
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
                  />
                  {formData.fixedPrice > 0 && formData.sessionCount > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Per session: {getCurrencySymbol(formData.currency)} {(formData.fixedPrice / formData.sessionCount).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Initial Payment Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Initial Payment
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                Specify how much the student is paying upfront. This can be the full amount, partial payment, or $0 for unpaid subscriptions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="initialPaymentAmount" className="text-sm font-semibold text-gray-700">
                    Payment Amount ({getCurrencySymbol(formData.currency)})
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol(formData.currency)}
                    </span>
                    <Input 
                      type="number" 
                      id="initialPaymentAmount" 
                      value={formData.initialPaymentAmount} 
                      onChange={(e) => setFormData({ ...formData, initialPaymentAmount: parseFloat(e.target.value) || 0 })}
                      className="mt-1 pl-7"
                      min="0"
                      max={getTotalPrice()}
                      step="0.01"
                    />
                  </div>
                  {getTotalPrice() > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Total subscription: {getCurrencySymbol(formData.currency)}{getTotalPrice().toFixed(2)}
                      {formData.initialPaymentAmount > 0 && (
                        <span className="ml-2">
                          ({formData.initialPaymentAmount >= getTotalPrice() ? 'Fully paid' : 
                           `Remaining: ${getCurrencySymbol(formData.currency)}${(getTotalPrice() - formData.initialPaymentAmount).toFixed(2)}`})
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700">Payment Method</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {paymentMethods.map((method) => (
                      <Button
                        key={method}
                        type="button"
                        variant={formData.paymentMethod === method ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, paymentMethod: method })}
                        className={cn(
                          "h-8 text-xs",
                          method === "Credit Card" && formData.paymentMethod === method && "bg-blue-600",
                          method === "PayPal" && formData.paymentMethod === method && "bg-indigo-600"
                        )}
                      >
                        {method === "Credit Card" && <CreditCard className="h-3 w-3 mr-1" />}
                        {method === "Cash" && <Receipt className="h-3 w-3 mr-1" />}
                        {method}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="paymentNotes" className="text-sm font-semibold text-gray-700">Payment Notes (Optional)</Label>
                <Textarea 
                  id="paymentNotes" 
                  placeholder="Add notes about this initial payment..."
                  value={formData.paymentNotes} 
                  onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>

              {formData.initialPaymentAmount === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>No Initial Payment:</strong> This subscription will be created without any payment. 
                    You can add payments later via the Payments tab.
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">Subscription Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Add any additional notes about this subscription..."
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || isCreating || formData.schedule.length === 0 || !formData.startDate}
                className="min-w-[160px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                size="lg"
              >
                {submitting || isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create Subscription
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Current Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading subscriptions...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 inline-block mb-3 text-amber-500" />
              <p className="text-muted-foreground">No subscriptions found for this student.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="py-6 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">
                        {subscription.session_count} Sessions - {subscription.duration_months} Month(s)
                      </h3>
                      <p className="text-muted-foreground">
                        Start Date: {formatDate(subscription.start_date)}
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          Total: {getCurrencySymbol(subscription.currency)} {subscription.total_price}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {subscription.status}
                        </Badge>
                      </div>
                    </div>
                    {!isViewMode && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleOpenDeleteDialog(subscription.id)}
                        disabled={deletingSubscriptionId === subscription.id}
                      >
                        {deletingSubscriptionId === subscription.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {subscription.notes && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {subscription.notes}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscription? This action cannot be undone and will also remove all associated lesson sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteSubscription(subscriptionToDelete || '')}
              className="bg-red-500 hover:bg-red-600"
              disabled={deletingSubscriptionId !== null}
            >
              {deletingSubscriptionId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionsTab;

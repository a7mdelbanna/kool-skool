import React, { useState, useEffect } from "react";
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
import { format, addMonths, addDays, getDay } from "date-fns";
import { CalendarIcon, Plus, Trash, Clock } from "lucide-react";
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
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { 
  getStudentSubscriptions, 
  addStudentSubscription, 
  deleteStudentSubscription,
  addLessonSessions,
  addStudentPayment
} from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
  isViewMode?: boolean;
}

interface DaySchedule {
  day: string;
  time: string;
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

const daysOfWeek = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

const durationOptions = [
  "1 month", "2 months", "3 months", "4 months", "5 months", "6 months", 
  "7 months", "8 months", "9 months", "10 months", "11 months", "12 months"
];

const currencyOptions = [
  { symbol: "$", code: "USD", name: "US Dollar" },
  { symbol: "€", code: "EUR", name: "Euro" },
  { symbol: "₽", code: "RUB", name: "Russian Ruble" },
];

const subscriptionSchema = z.object({
  sessionCount: z.coerce.number().min(1, { message: "At least 1 session required" }),
  duration: z.string().min(1, { message: "Duration is required" }),
  startDate: z.date({ required_error: "Start date is required" }),
  schedule: z.array(z.object({
    day: z.string(),
    time: z.string()
  })).min(1, { message: "At least one day with time must be selected" }),
  priceMode: z.enum(["perSession", "fixed"]),
  pricePerSession: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  fixedPrice: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false 
}) => {
  const [subscriptions, setSubscriptions] = useState<DatabaseSubscription[]>([]);
  const [selectedDays, setSelectedDays] = useState<DaySchedule[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      sessionCount: 1,
      duration: "1 month",
      startDate: new Date(),
      schedule: [], 
      priceMode: "perSession",
      pricePerSession: 0,
      fixedPrice: 0,
      currency: "USD",
      notes: "",
    },
  });
  
  const watchPriceMode = form.watch("priceMode");
  const watchPricePerSession = form.watch("pricePerSession");
  const watchFixedPrice = form.watch("fixedPrice");
  const watchSessionCount = form.watch("sessionCount");
  const watchCurrency = form.watch("currency");
  
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
      const data = await getStudentSubscriptions(studentData.id);
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencyOptions.find(c => c.code === currencyCode);
    return currency ? currency.symbol : "$";
  };
  
  useEffect(() => {
    const newTotalPrice = calculateTotalPrice();
    setTotalPrice(newTotalPrice);
  }, [watchPriceMode, watchPricePerSession, watchFixedPrice, watchSessionCount]);
  
  const calculateTotalPrice = (): number => {
    if (watchPriceMode === "perSession") {
      return Number(watchPricePerSession) * Number(watchSessionCount);
    } else {
      return Number(watchFixedPrice);
    }
  };
  
  const toggleDay = (day: string) => {
    const existingDay = selectedDays.find(d => d.day === day);
    
    if (existingDay) {
      const updatedDays = selectedDays.filter(d => d.day !== day);
      setSelectedDays(updatedDays);
      form.setValue("schedule", updatedDays);
    } else {
      const newDay: DaySchedule = { day: day, time: "15:00" };
      const newSchedule = [...selectedDays, newDay];
      setSelectedDays(newSchedule);
      form.setValue("schedule", newSchedule);
    }
  };
  
  const updateDayTime = (day: string, time: string) => {
    const updatedDays = selectedDays.map(d => 
      d.day === day ? { day: day, time: time } : d
    );
    setSelectedDays(updatedDays);
    form.setValue("schedule", updatedDays);
  };
  
  const generateSessions = (subscription: DatabaseSubscription) => {
    const { session_count, start_date, schedule, price_per_session, fixed_price, price_mode, duration_months, id, student_id } = subscription;
    
    const startDate = new Date(start_date);
    const endDate = addMonths(startDate, duration_months);
    
    const dayMapping: { [key: string]: number } = {
      "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, 
      "Friday": 5, "Saturday": 6, "Sunday": 0
    };
    
    const sessionDates: Date[] = [];
    let currentDate = new Date(startDate);
    
    const scheduleArray = Array.isArray(schedule) ? schedule : [];
    
    while (currentDate < endDate && sessionDates.length < session_count) {
      for (const { day, time } of scheduleArray) {
        const dayNumber = dayMapping[day];
        const currentDayNumber = getDay(currentDate);
        
        let daysToAdd = dayNumber - currentDayNumber;
        if (daysToAdd < 0) daysToAdd += 7;
        
        if (daysToAdd === 0 && currentDate.getTime() === startDate.getTime()) {
          // Same day as start date
        } else if (daysToAdd === 0) {
          daysToAdd = 7;
        }
        
        const sessionDate = addDays(new Date(currentDate), daysToAdd);
        
        const [hours, minutes] = time.split(':').map(Number);
        sessionDate.setHours(hours, minutes);
        
        if (sessionDate <= endDate && sessionDates.length < session_count) {
          sessionDates.push(sessionDate);
        }
      }
      
      currentDate = addDays(currentDate, 7);
    }
    
    const cost = price_mode === "perSession" 
      ? (price_per_session || 0)
      : (fixed_price || 0) / session_count;
    
    return sessionDates.slice(0, session_count).map(date => ({
      subscription_id: id,
      student_id: student_id,
      scheduled_date: date.toISOString(),
      duration_minutes: 60,
      status: "scheduled" as const,
      payment_status: "paid" as const,
      cost,
      notes: subscription.notes || undefined,
    }));
  };
  
  const handleAddSubscription = async (data: SubscriptionFormValues) => {
    if (!studentData.id) {
      toast({
        title: "Error",
        description: "Student ID is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const calculatedTotalPrice = calculateTotalPrice();
      const durationMonths = parseInt(data.duration.split(" ")[0]);
      
      const subscriptionData = {
        student_id: studentData.id,
        session_count: data.sessionCount,
        duration_months: durationMonths,
        start_date: format(data.startDate, "yyyy-MM-dd"),
        schedule: data.schedule,
        price_mode: data.priceMode,
        price_per_session: data.priceMode === "perSession" ? Number(data.pricePerSession) : undefined,
        fixed_price: data.priceMode === "fixed" ? Number(data.fixedPrice) : undefined,
        total_price: calculatedTotalPrice,
        currency: data.currency,
        notes: data.notes || undefined,
      };
      
      // Add the subscription to database
      const newSubscriptionResult = await addStudentSubscription(subscriptionData);
      console.log('New subscription created:', newSubscriptionResult);
      
      // The RPC function returns an array, so we need to get the first item
      const newSubscription = Array.isArray(newSubscriptionResult) ? newSubscriptionResult[0] : newSubscriptionResult;
      
      // Ensure we have a valid subscription object
      if (!newSubscription || typeof newSubscription !== 'object') {
        throw new Error('Invalid subscription data returned');
      }

      // Convert the returned subscription to the expected format
      const subscriptionForSessions: DatabaseSubscription = {
        id: newSubscription.id,
        student_id: newSubscription.student_id,
        session_count: newSubscription.session_count,
        duration_months: newSubscription.duration_months,
        start_date: newSubscription.start_date,
        schedule: newSubscription.schedule,
        price_mode: newSubscription.price_mode,
        price_per_session: newSubscription.price_per_session,
        fixed_price: newSubscription.fixed_price,
        total_price: newSubscription.total_price,
        currency: newSubscription.currency,
        notes: newSubscription.notes,
        status: newSubscription.status,
        created_at: newSubscription.created_at
      };
      
      // Generate and add lesson sessions
      const sessions = generateSessions(subscriptionForSessions);
      if (sessions.length > 0) {
        await addLessonSessions(sessions);
      }
      
      // Add payment record
      await addStudentPayment({
        student_id: studentData.id,
        amount: calculatedTotalPrice,
        currency: data.currency,
        payment_date: format(new Date(), "yyyy-MM-dd"),
        payment_method: "Credit Card",
        status: "completed",
        notes: `Payment for ${data.sessionCount} lessons (${data.duration}) starting on ${format(data.startDate, "PPP")}`,
      });
      
      toast({
        title: "Success",
        description: "Subscription added successfully",
      });
      
      // Reload subscriptions and reset form
      await loadSubscriptions();
      form.reset();
      setSelectedDays([]);
      
    } catch (error) {
      console.error('Error adding subscription:', error);
      toast({
        title: "Error",
        description: "Failed to add subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveSubscription = async (id: string) => {
    try {
      setLoading(true);
      await deleteStudentSubscription(id);
      
      toast({
        title: "Success",
        description: "Subscription removed successfully",
      });
      
      await loadSubscriptions();
    } catch (error) {
      console.error('Error removing subscription:', error);
      toast({
        title: "Error",
        description: "Failed to remove subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (months: number) => {
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const formatSchedule = (schedule: any) => {
    if (!Array.isArray(schedule)) return '';
    return schedule.map(s => `${s.day} at ${s.time}`).join(", ");
  };

  if (loading && subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Current Subscriptions</h3>
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-muted/30">
            <p className="text-muted-foreground">No subscriptions yet</p>
            <p className="text-sm text-muted-foreground">
              {!isViewMode && "Add a new subscription below to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription) => (
              <div 
                key={subscription.id}
                className="border rounded-md p-4 flex justify-between items-start"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{subscription.session_count} Sessions</h4>
                    <span className="text-sm text-muted-foreground">({formatDuration(subscription.duration_months)})</span>
                  </div>
                  <p className="text-sm my-1">
                    Starting {format(new Date(subscription.start_date), "PPP")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatSchedule(subscription.schedule)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {getCurrencySymbol(subscription.currency)}{subscription.total_price.toFixed(2)}
                    </span>
                    {subscription.price_mode === "perSession" && subscription.price_per_session && (
                      <span className="text-xs text-muted-foreground">
                        ({getCurrencySymbol(subscription.currency)}{subscription.price_per_session.toFixed(2)} per session)
                      </span>
                    )}
                    {subscription.price_mode === "fixed" && (
                      <span className="text-xs text-muted-foreground">
                        (Fixed price)
                      </span>
                    )}
                  </div>
                  {subscription.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{subscription.notes}</p>
                  )}
                </div>
                {!isViewMode && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveSubscription(subscription.id)}
                    disabled={loading}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {!isViewMode && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Add New Subscription</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddSubscription)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sessionCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Sessions</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durationOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
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
                            className={cn("p-3")}
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
                name="schedule"
                render={() => (
                  <FormItem>
                    <FormLabel>Days of Week & Time</FormLabel>
                    <div className="space-y-4 mt-2">
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day) => (
                          <Button
                            key={day}
                            type="button"
                            variant={selectedDays.some(d => d.day === day) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleDay(day)}
                            className="h-8"
                          >
                            {day.substring(0, 3)}
                          </Button>
                        ))}
                      </div>
                      
                      {selectedDays.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <p className="text-sm text-muted-foreground">Set time for each day:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {selectedDays.map((daySchedule) => (
                              <div key={daySchedule.day} className="flex items-center border rounded-md p-2 gap-2">
                                <span className="text-sm font-medium w-20">{daySchedule.day.substring(0, 3)}</span>
                                <div className="relative flex-1">
                                  <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="time"
                                    value={daySchedule.time}
                                    onChange={(e) => updateDayTime(daySchedule.day, e.target.value)}
                                    className="pl-8"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priceMode"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>Pricing Method</FormLabel>
                    <FormControl>
                      <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={(value) => {
                          if (value) field.onChange(value);
                        }}
                        className="justify-start"
                      >
                        <ToggleGroupItem value="perSession" aria-label="Per Session">
                          Per Session
                        </ToggleGroupItem>
                        <ToggleGroupItem value="fixed" aria-label="Fixed Price">
                          Fixed Price
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencyOptions.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <div className="flex items-center">
                              <span className="mr-2">{currency.symbol}</span>
                              <span>{currency.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  {watchPriceMode === "perSession" ? (
                    <FormField
                      control={form.control}
                      name="pricePerSession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per Session</FormLabel>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                              {getCurrencySymbol(watchCurrency)}
                            </div>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                className="pl-7"
                                {...field} 
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="fixedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fixed Price</FormLabel>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                              {getCurrencySymbol(watchCurrency)}
                            </div>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                className="pl-7"
                                {...field} 
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <div className="flex-1">
                  <FormLabel>Total Price</FormLabel>
                  <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                    <span className="font-medium">{getCurrencySymbol(watchCurrency)}{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional notes about this subscription"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full mt-4" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? "Adding..." : "Add Subscription"}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsTab;

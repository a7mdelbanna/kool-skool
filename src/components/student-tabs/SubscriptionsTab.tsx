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
import { format } from "date-fns";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SubscriptionsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
}

interface DaySchedule {
  day: string;
  time: string;
}

interface Subscription {
  id: string;
  sessionCount: number;
  duration: string;
  startDate: Date;
  schedule: DaySchedule[];
  priceMode: "perSession" | "fixed";
  pricePerSession: number;
  fixedPrice: number;
  totalPrice: number;
  currency: string;
  notes: string;
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

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ studentData, setStudentData }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedDays, setSelectedDays] = useState<DaySchedule[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  
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
  
  const handleAddSubscription = (data: SubscriptionFormValues) => {
    const calculatedTotalPrice = calculateTotalPrice();
    
    const newSubscription: Subscription = {
      id: Date.now().toString(),
      sessionCount: data.sessionCount,
      duration: data.duration,
      startDate: data.startDate,
      schedule: data.schedule as DaySchedule[],
      priceMode: data.priceMode,
      pricePerSession: Number(data.pricePerSession),
      fixedPrice: Number(data.fixedPrice),
      totalPrice: calculatedTotalPrice,
      currency: data.currency,
      notes: data.notes || "",
    };
    
    setSubscriptions([...subscriptions, newSubscription]);
    form.reset();
    setSelectedDays([]);
  };
  
  const handleRemoveSubscription = (id: string) => {
    setSubscriptions(subscriptions.filter(sub => sub.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Current Subscriptions</h3>
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-muted/30">
            <p className="text-muted-foreground">No subscriptions yet</p>
            <p className="text-sm text-muted-foreground">
              Add a new subscription below to get started
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
                    <h4 className="font-medium">{subscription.sessionCount} Sessions</h4>
                    <span className="text-sm text-muted-foreground">({subscription.duration})</span>
                  </div>
                  <p className="text-sm my-1">
                    Starting {format(subscription.startDate, "PPP")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {subscription.schedule.map(s => `${s.day} at ${s.time}`).join(", ")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {getCurrencySymbol(subscription.currency)}{subscription.totalPrice.toFixed(2)}
                    </span>
                    {subscription.priceMode === "perSession" && (
                      <span className="text-xs text-muted-foreground">
                        ({getCurrencySymbol(subscription.currency)}{subscription.pricePerSession.toFixed(2)} per session)
                      </span>
                    )}
                    {subscription.priceMode === "fixed" && (
                      <span className="text-xs text-muted-foreground">
                        (Fixed price)
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleRemoveSubscription(subscription.id)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
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
            
            <Button type="submit" className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default SubscriptionsTab;

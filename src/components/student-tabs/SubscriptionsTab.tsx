
import React, { useState } from "react";
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
import { CalendarIcon, Plus, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Student } from "@/components/StudentCard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface SubscriptionsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
}

interface Subscription {
  id: string;
  sessionCount: number;
  duration: string;
  startDate: Date;
  daysOfWeek: string[];
  time: string;
  pricePerSession: number;
  totalPrice: number;
  notes: string;
}

const daysOfWeek = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

const subscriptionSchema = z.object({
  sessionCount: z.coerce.number().min(1, { message: "At least 1 session required" }),
  duration: z.string().min(1, { message: "Duration is required" }),
  startDate: z.date({ required_error: "Start date is required" }),
  daysOfWeek: z.array(z.string()).min(1, { message: "At least one day must be selected" }),
  time: z.string().min(1, { message: "Time is required" }),
  pricePerSession: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  notes: z.string().optional(),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ studentData, setStudentData }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      sessionCount: 1,
      duration: "1 month",
      startDate: new Date(),
      daysOfWeek: [],
      time: "15:00",
      pricePerSession: 0,
      notes: "",
    },
  });
  
  const watchPricePerSession = form.watch("pricePerSession");
  const watchSessionCount = form.watch("sessionCount");
  const totalPrice = watchPricePerSession * watchSessionCount;
  
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
      form.setValue("daysOfWeek", selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
      form.setValue("daysOfWeek", [...selectedDays, day]);
    }
  };
  
  const handleAddSubscription = (data: SubscriptionFormValues) => {
    const newSubscription: Subscription = {
      id: Date.now().toString(),
      ...data,
      totalPrice: data.pricePerSession * data.sessionCount,
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
                    {subscription.daysOfWeek.join(", ")} at {subscription.time}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-medium">${subscription.totalPrice}</span>
                    <span className="text-xs text-muted-foreground">
                      (${subscription.pricePerSession} per session)
                    </span>
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
                    <FormControl>
                      <Input placeholder="e.g., 1 month, 3 months" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="daysOfWeek"
              render={() => (
                <FormItem>
                  <FormLabel>Days of Week</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {daysOfWeek.map((day) => (
                      <Button
                        key={day}
                        type="button"
                        variant={selectedDays.includes(day) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(day)}
                        className="h-8"
                      >
                        {day.substring(0, 3)}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pricePerSession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Session ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Total Price</FormLabel>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                  <span className="font-medium">${totalPrice.toFixed(2)}</span>
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

import React, { useState, useEffect } from "react";
import { Calendar, Clock, DollarSign, FileText, Trash2, CheckCircle, AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false 
}) => {
  const [subscriptions, setSubscriptions] = useState<DatabaseSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isCreating, preventRapidCalls } = useSubscriptionCreation();
  
  // Enhanced form state with multiple schedule support
  const [formData, setFormData] = useState({
    sessionCount: 4,
    durationMonths: 1,
    startDate: '',
    schedule: [] as ScheduleItem[],
    priceMode: 'perSession',
    pricePerSession: 0,
    fixedPrice: 0,
    currency: 'USD',
    notes: ''
  });
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<string | null>(null);

  const currencies = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'CAD', label: 'CAD (C$)' },
    { value: 'AUD', label: 'AUD (A$)' },
  ];

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

    try {
      setSubmitting(true);
      console.log('🚀 SUBMITTING ENHANCED SUBSCRIPTION WITH MULTIPLE DAYS');
      
      const totalPrice = formData.priceMode === 'perSession' 
        ? formData.pricePerSession * formData.sessionCount 
        : formData.fixedPrice;

      const subscriptionData = {
        student_id: studentData.id,
        session_count: formData.sessionCount,
        duration_months: formData.durationMonths,
        start_date: formData.startDate,
        schedule: formData.schedule,
        price_mode: formData.priceMode,
        price_per_session: formData.priceMode === 'perSession' ? formData.pricePerSession : null,
        fixed_price: formData.priceMode === 'fixed' ? formData.fixedPrice : null,
        total_price: totalPrice,
        currency: formData.currency,
        notes: formData.notes,
        status: 'active'
      };

      console.log('📝 Enhanced subscription data prepared:', subscriptionData);
      
      await addStudentSubscription(subscriptionData);
      
      toast({
        title: "Success",
        description: "Subscription created successfully with multiple schedules",
      });
      
      // Reset form
      setFormData({
        sessionCount: 4,
        durationMonths: 1,
        startDate: '',
        schedule: [],
        priceMode: 'perSession',
        pricePerSession: 0,
        fixedPrice: 0,
        currency: 'USD',
        notes: ''
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
      console.log('🗑️ Starting subscription deletion for ID:', subscriptionId);
      setDeletingSubscriptionId(subscriptionId);
      
      // Call the delete function
      await deleteStudentSubscription(subscriptionId);
      
      console.log('✅ Subscription deleted successfully from database');
      
      // Show success message
      toast({
        title: "Success",
        description: "Subscription deleted successfully",
      });
      
      // Force reload subscriptions from database
      console.log('🔄 Forcing reload of subscriptions after deletion');
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
                <Select onValueChange={(value) => setFormData({ ...formData, currency: value })}>
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

            {/* Start Date */}
            <div>
              <Label htmlFor="startDate" className="text-sm font-semibold text-gray-700">Start Date</Label>
              <Input 
                type="date" 
                id="startDate" 
                value={formData.startDate} 
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="mt-1 max-w-xs"
              />
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
                    <Input 
                      type="time" 
                      value={schedule.time}
                      onChange={(e) => updateScheduleItem(index, 'time', e.target.value)}
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
                <Select onValueChange={(value) => setFormData({ ...formData, priceMode: value })}>
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
                    Price Per Session ({formData.currency})
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
                      Total: {formData.currency} {(formData.pricePerSession * formData.sessionCount).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {formData.priceMode === 'fixed' && (
                <div>
                  <Label htmlFor="fixedPrice" className="text-sm font-semibold text-gray-700">
                    Fixed Price ({formData.currency})
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
                      Per session: {formData.currency} {(formData.fixedPrice / formData.sessionCount).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
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
            
            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || isCreating || formData.schedule.length === 0}
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
                          Total: {subscription.currency} {subscription.total_price}
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

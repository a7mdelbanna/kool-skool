import React, { useState, useEffect } from "react";
import { Calendar, Clock, DollarSign, FileText, Trash2, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
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

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false 
}) => {
  const [subscriptions, setSubscriptions] = useState<DatabaseSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isCreating, preventRapidCalls } = useSubscriptionCreation();
  
  // Form state
  const [formData, setFormData] = useState({
    sessionCount: 4,
    durationMonths: 1,
    startDate: '',
    selectedDay: '',
    selectedTime: '',
    priceMode: 'perSession',
    pricePerSession: 0,
    fixedPrice: 0,
    notes: ''
  });
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setSubscriptions(Array.isArray(data) ? data : []);
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
    if (!formData.startDate || !formData.selectedDay || !formData.selectedTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      console.log('🚀 SUBMITTING SUBSCRIPTION WITH DUPLICATE PREVENTION');
      
      const totalPrice = formData.priceMode === 'perSession' 
        ? formData.pricePerSession * formData.sessionCount 
        : formData.fixedPrice;

      const subscriptionData = {
        student_id: studentData.id,
        session_count: formData.sessionCount,
        duration_months: formData.durationMonths,
        start_date: formData.startDate,
        schedule: [{
          day: formData.selectedDay,
          time: formData.selectedTime
        }],
        price_mode: formData.priceMode,
        price_per_session: formData.priceMode === 'perSession' ? formData.pricePerSession : null,
        fixed_price: formData.priceMode === 'fixed' ? formData.fixedPrice : null,
        total_price: totalPrice,
        currency: 'USD',
        notes: formData.notes,
        status: 'active'
      };

      console.log('📝 Subscription data prepared:', subscriptionData);
      
      await addStudentSubscription(subscriptionData);
      
      toast({
        title: "Success",
        description: "Subscription created successfully",
      });
      
      // Reset form
      setFormData({
        sessionCount: 4,
        durationMonths: 1,
        startDate: '',
        selectedDay: '',
        selectedTime: '',
        priceMode: 'perSession',
        pricePerSession: 0,
        fixedPrice: 0,
        notes: ''
      });
      
      // Reload subscriptions
      await loadSubscriptions();
      
    } catch (error) {
      console.error('❌ Error creating subscription:', error);
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
    try {
      setLoading(true);
      await deleteStudentSubscription(subscriptionId);
      toast({
        title: "Success",
        description: "Subscription deleted successfully",
      });
      await loadSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: "Error",
        description: "Failed to delete subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setSubscriptionToDelete(null);
    }
  };

  const handleOpenDeleteDialog = (subscriptionId: string) => {
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Create New Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessionCount">Session Count</Label>
                <Input 
                  type="number" 
                  id="sessionCount" 
                  value={formData.sessionCount} 
                  onChange={(e) => setFormData({ ...formData, sessionCount: parseInt(e.target.value) })} 
                />
              </div>
              <div>
                <Label htmlFor="durationMonths">Duration (Months)</Label>
                <Input 
                  type="number" 
                  id="durationMonths" 
                  value={formData.durationMonths} 
                  onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) })} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input 
                  type="date" 
                  id="startDate" 
                  value={formData.startDate} 
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
                />
              </div>
              <div>
                <Label htmlFor="selectedDay">Day of Week</Label>
                <Select onValueChange={(value) => setFormData({ ...formData, selectedDay: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a day" defaultValue={formData.selectedDay} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monday">Monday</SelectItem>
                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                    <SelectItem value="Thursday">Thursday</SelectItem>
                    <SelectItem value="Friday">Friday</SelectItem>
                    <SelectItem value="Saturday">Saturday</SelectItem>
                    <SelectItem value="Sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="selectedTime">Time of Day</Label>
              <Input 
                type="time" 
                id="selectedTime" 
                value={formData.selectedTime} 
                onChange={(e) => setFormData({ ...formData, selectedTime: e.target.value })} 
              />
            </div>

            <div>
              <Label>Price Mode</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, priceMode: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select price mode" defaultValue={formData.priceMode} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perSession">Per Session</SelectItem>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.priceMode === 'perSession' && (
              <div>
                <Label htmlFor="pricePerSession">Price Per Session</Label>
                <Input 
                  type="number" 
                  id="pricePerSession" 
                  value={formData.pricePerSession} 
                  onChange={(e) => setFormData({ ...formData, pricePerSession: parseFloat(e.target.value) })} 
                />
              </div>
            )}

            {formData.priceMode === 'fixed' && (
              <div>
                <Label htmlFor="fixedPrice">Fixed Price</Label>
                <Input 
                  type="number" 
                  id="fixedPrice" 
                  value={formData.fixedPrice} 
                  onChange={(e) => setFormData({ ...formData, fixedPrice: parseFloat(e.target.value) })} 
                />
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Subscription notes" 
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || isCreating}
                className="min-w-[120px]"
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Current Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading subscriptions...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-4">
              <AlertTriangle className="h-6 w-6 inline-block mb-2 text-amber-500" />
              <p className="text-muted-foreground">No subscriptions found for this student.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {subscription.session_count} Sessions - {subscription.duration_months} Month(s)
                      </h3>
                      <p className="text-muted-foreground">
                        Start Date: {formatDate(subscription.start_date)}
                      </p>
                      <Badge className="mt-1">
                        Total Price: ${subscription.total_price}
                      </Badge>
                    </div>
                    {!isViewMode && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleOpenDeleteDialog(subscription.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                  {subscription.notes && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-sm text-muted-foreground">
                        Notes: {subscription.notes}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscription? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteSubscription(subscriptionToDelete || '')}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionsTab;

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  X,
  Send,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInHours, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  scheduled_date: string;
  duration_minutes: number;
  status: string;
  notes?: string;
  cost: number;
}

interface CancellationModalProps {
  session: Session;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  schoolSettings?: {
    cancellation_notice_hours: number;
    allow_student_cancellation: boolean;
  };
}

const CancellationModal: React.FC<CancellationModalProps> = ({
  session,
  open,
  onOpenChange,
  onSuccess,
  schoolSettings = {
    cancellation_notice_hours: 24,
    allow_student_cancellation: true
  }
}) => {
  const [requestType, setRequestType] = useState<'cancel' | 'reschedule'>('cancel');
  const [reason, setReason] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [hoursBeforeSession, setHoursBeforeSession] = useState(0);
  const [withinNotice, setWithinNotice] = useState(false);

  const cancellationReasons = [
    'Personal emergency',
    'Illness',
    'Schedule conflict',
    'Travel',
    'Technical issues',
    'Other'
  ];

  useEffect(() => {
    if (session && open) {
      const sessionDate = new Date(session.scheduled_date);
      const now = new Date();
      const hoursDiff = differenceInHours(sessionDate, now);
      setHoursBeforeSession(hoursDiff);
      setWithinNotice(hoursDiff >= schoolSettings.cancellation_notice_hours);
    }
  }, [session, open, schoolSettings]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for your request');
      return;
    }

    if (requestType === 'reschedule' && !selectedDate) {
      toast.error('Please select a new date for rescheduling');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('request_session_cancellation', {
        p_session_id: session.id,
        p_reason: reason,
        p_request_type: requestType,
        p_requested_date: requestType === 'reschedule' ? selectedDate?.toISOString() : null
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit request');
      }

      // Show appropriate success message
      if (data.status === 'auto_approved') {
        toast.success(
          withinNotice
            ? 'Your cancellation has been approved automatically. The session will be rescheduled.'
            : 'Your cancellation request has been submitted. Since it\'s outside the notice period, the session will count as completed.'
        );
      } else {
        toast.success('Your request has been submitted for review. You will be notified once it\'s processed.');
      }

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting cancellation request:', error);
      toast.error('Failed to submit your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRequestType('cancel');
    setReason('');
    setSelectedDate(undefined);
  };

  const getStatusBadge = () => {
    if (withinNotice) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Within Notice Period
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-orange-100 text-orange-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Outside Notice Period
        </Badge>
      );
    }
  };

  const getWarningMessage = () => {
    if (withinNotice) {
      return (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your request is within the {schoolSettings.cancellation_notice_hours}-hour notice period. 
            If approved, this session will not count against your subscription.
          </AlertDescription>
        </Alert>
      );
    } else {
      return (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Your request is outside the {schoolSettings.cancellation_notice_hours}-hour notice period. 
            If cancelled, this session will count as completed in your subscription.
          </AlertDescription>
        </Alert>
      );
    }
  };

  if (!schoolSettings.allow_student_cancellation) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancellation Not Available</DialogTitle>
          </DialogHeader>
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Student cancellations are not enabled for your school. 
              Please contact your teacher or administrator directly.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Session Change</DialogTitle>
          <DialogDescription>
            Submit a request to cancel or reschedule your upcoming session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Session Details */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Session Date:</span>
              <span className="text-sm">
                {format(new Date(session.scheduled_date), 'PPP')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Time:</span>
              <span className="text-sm">
                {format(new Date(session.scheduled_date), 'p')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Duration:</span>
              <span className="text-sm">{session.duration_minutes} minutes</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Time Until Session:</span>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span className="text-sm font-semibold">
                  {hoursBeforeSession} hours
                </span>
                {getStatusBadge()}
              </div>
            </div>
          </div>

          {/* Warning Message */}
          {getWarningMessage()}

          {/* Request Type */}
          <div className="space-y-2">
            <Label>Request Type</Label>
            <RadioGroup value={requestType} onValueChange={(value: 'cancel' | 'reschedule') => setRequestType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cancel" id="cancel" />
                <Label htmlFor="cancel" className="font-normal cursor-pointer">
                  Cancel Session
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reschedule" id="reschedule" />
                <Label htmlFor="reschedule" className="font-normal cursor-pointer">
                  Reschedule Session
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reschedule Date Selection */}
          {requestType === 'reschedule' && (
            <div className="space-y-2">
              <Label>Preferred New Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => 
                      date < addDays(new Date(), 1) || 
                      date > addDays(new Date(), 60)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Select a date within the next 60 days for rescheduling
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Request</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for your cancellation/rescheduling request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {cancellationReasons.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setReason(r)}
                >
                  {r}
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <ul className="text-sm space-y-1 mt-2">
                <li>• Your teacher will be notified of this request</li>
                <li>• You will receive an email confirmation</li>
                {withinNotice && (
                  <li>• If approved, we'll help you find a replacement session</li>
                )}
                {!withinNotice && (
                  <li className="text-orange-600">
                    • This session will be marked as completed if cancelled
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancellationModal;
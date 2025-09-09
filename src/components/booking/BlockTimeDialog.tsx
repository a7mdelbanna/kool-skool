import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Ban, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { teacherAvailabilityService } from '@/services/firebase/teacherAvailability.service';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  onSuccess?: () => void;
  initialDate?: Date;
}

const BlockTimeDialog: React.FC<Props> = ({ 
  open, 
  onOpenChange, 
  teacherId, 
  onSuccess,
  initialDate 
}) => {
  const [loading, setLoading] = useState(false);
  const [blockType, setBlockType] = useState<'blocked' | 'available'>('blocked');
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'weekly' | 'monthly'>('weekly');

  const handleSubmit = async () => {
    if (!date || !startTime || !endTime) {
      toast.error('Please select date and time range');
      return;
    }

    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      setLoading(true);
      
      await teacherAvailabilityService.blockTimeSlot({
        teacher_id: teacherId,
        type: blockType,
        date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        reason: reason || undefined,
        recurring: recurring,
        recurrence_pattern: recurring ? recurrencePattern : undefined
      });

      toast.success(
        blockType === 'blocked' 
          ? 'Time slot blocked successfully' 
          : 'Time slot made available successfully'
      );
      
      // Reset form
      setBlockType('blocked');
      setDate(new Date());
      setStartTime('09:00');
      setEndTime('17:00');
      setReason('');
      setRecurring(false);
      setRecurrencePattern('weekly');
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error blocking time slot:', error);
      toast.error('Failed to block time slot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Block or Override Time
          </DialogTitle>
          <DialogDescription>
            Block time slots or create availability exceptions for specific dates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Block Type */}
          <div className="space-y-2">
            <Label>Action Type</Label>
            <RadioGroup value={blockType} onValueChange={(value) => setBlockType(value as 'blocked' | 'available')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blocked" id="blocked" />
                <Label htmlFor="blocked" className="flex items-center gap-2 cursor-pointer">
                  <Ban className="h-4 w-4 text-red-500" />
                  Block Time (Make Unavailable)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="available" id="available" />
                <Label htmlFor="available" className="flex items-center gap-2 cursor-pointer">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Override to Available
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">
                <Clock className="inline h-4 w-4 mr-1" />
                Start Time
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">
                <Clock className="inline h-4 w-4 mr-1" />
                End Time
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              placeholder={blockType === 'blocked' ? "e.g., Personal appointment, Holiday..." : "e.g., Extra availability for exams..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Recurring Option */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={recurring}
                onCheckedChange={(checked) => setRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="cursor-pointer">
                Make this a recurring {blockType === 'blocked' ? 'block' : 'availability'}
              </Label>
            </div>
            
            {recurring && (
              <div className="ml-6 space-y-2">
                <Label>Recurrence Pattern</Label>
                <Select value={recurrencePattern} onValueChange={(value) => setRecurrencePattern(value as 'weekly' | 'monthly')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly (Same day every week)</SelectItem>
                    <SelectItem value="monthly">Monthly (Same date every month)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This will repeat {recurrencePattern === 'weekly' ? 'every week on the same day' : 'every month on the same date'}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={blockType === 'blocked' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                {blockType === 'blocked' ? 'Block Time' : 'Make Available'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTimeDialog;
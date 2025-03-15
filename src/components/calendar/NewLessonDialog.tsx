
import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePayments } from '@/contexts/PaymentContext';
import { toast } from '@/components/ui/use-toast';

interface NewLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

const subjects = [
  'Mathematics',
  'Science',
  'English',
  'Physics',
  'Chemistry',
  'Biology',
  'Geography',
  'Literature',
  'Computer Science'
];

const durations = ['30 min', '45 min', '60 min', '90 min', '120 min'];
const timeSlots = Array.from({ length: 13 }, (_, i) => {
  const hour = i + 8; // Start from 8 AM
  return `${hour}:00`;
});

const NewLessonDialog: React.FC<NewLessonDialogProps> = ({ 
  open, 
  onOpenChange,
  initialDate = new Date() 
}) => {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [student, setStudent] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  
  const { addSessions } = usePayments();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !student || !subject || !time || !duration) {
      toast({
        title: "Missing information",
        description: "Please fill out all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Create the lesson
    const newSession = {
      id: `session-${Date.now()}`,
      date: date,
      time: time,
      duration: duration,
      status: "scheduled" as const,
      paymentStatus: "unpaid" as const,
      notes: `${subject} lesson with ${student}`,
      sessionNumber: 1,
      totalSessions: 10
    };
    
    // Add to context
    addSessions([newSession]);
    
    // Show toast
    toast({
      title: "Lesson created",
      description: `${subject} lesson with ${student} on ${format(date, 'MMM d')} at ${time}`
    });
    
    // Reset form and close dialog
    resetForm();
    onOpenChange(false);
  };
  
  const resetForm = () => {
    setDate(initialDate);
    setStudent('');
    setSubject('');
    setTime('');
    setDuration('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Lesson</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Student Name */}
          <div className="space-y-2">
            <Label htmlFor="student">Student Name</Label>
            <Input 
              id="student" 
              placeholder="Enter student name" 
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            />
          </div>
          
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub) => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
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
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="time" className="w-full">
                <SelectValue placeholder="Select a time">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    {time || "Select a time"}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durations.map((dur) => (
                  <SelectItem key={dur} value={dur}>{dur}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Lesson</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewLessonDialog;

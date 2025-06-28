
import React, { useState, useEffect, useContext } from 'react';
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
import { Calendar as CalendarIcon, Clock, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { getCurrentUserInfo, getStudentsWithDetails } from '@/integrations/supabase/client';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import { getSchoolTimezone, convertSchoolTimeToUTC, formatInUserTimezone, getEffectiveTimezone } from '@/utils/timezone';

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
  const { user } = useContext(UserContext);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [studentId, setStudentId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [schoolTimezone, setSchoolTimezone] = useState<string>('');
  const userTimezone = getEffectiveTimezone(user?.timezone);

  // Fetch students and school timezone when dialog opens
  useEffect(() => {
    const fetchData = async () => {
      if (!open || !user?.schoolId) return;
      
      try {
        setLoading(true);
        
        // Fetch students
        const userInfo = await getCurrentUserInfo();
        if (!userInfo || userInfo.length === 0) {
          console.error('No user info found');
          return;
        }

        const currentUser = userInfo[0];
        const studentsData = await getStudentsWithDetails(currentUser.user_school_id);
        setStudents(studentsData);

        // Fetch school timezone
        const timezone = await getSchoolTimezone(user.schoolId);
        setSchoolTimezone(timezone);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, user?.schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !studentId || !subject || !time || !duration || !user?.schoolId) {
      toast({
        title: "Missing information",
        description: "Please fill out all required fields",
        variant: "destructive"
      });
      return;
    }

    const selectedStudent = students.find(s => s.id === studentId);
    if (!selectedStudent) {
      toast({
        title: "Error",
        description: "Selected student not found",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create datetime in school timezone
      const [hours, minutes] = time.split(':').map(Number);
      const localDateTime = new Date(date);
      localDateTime.setHours(hours, minutes, 0, 0);
      
      // Convert to UTC for storage using school timezone
      const utcDateTime = await convertSchoolTimeToUTC(localDateTime, user.schoolId);
      
      // Parse duration
      const durationMinutes = parseInt(duration.replace(' min', ''));
      
      // Create lesson session in database
      const { error } = await supabase
        .from('lesson_sessions')
        .insert({
          student_id: studentId,
          scheduled_date: utcDateTime.toISOString(),
          duration_minutes: durationMinutes,
          status: 'scheduled',
          payment_status: 'pending',
          cost: cost ? parseFloat(cost) : 0,
          notes: `${subject} lesson - Created via calendar`
        });

      if (error) throw error;
      
      toast({
        title: "Lesson scheduled",
        description: `${subject} lesson with ${selectedStudent.first_name} ${selectedStudent.last_name} on ${format(date, 'MMM d')} at ${time} (${schoolTimezone})`,
      });
      
      // Reset form and close dialog
      resetForm();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error creating lesson:', error);
      toast({
        title: "Error",
        description: "Failed to create lesson",
        variant: "destructive"
      });
    }
  };
  
  const resetForm = () => {
    setDate(initialDate);
    setStudentId('');
    setSubject('');
    setTime('');
    setDuration('');
    setCost('');
  };

  // Format the selected date for display in user's timezone
  const formatDateForDisplay = (date: Date) => {
    return formatInUserTimezone(date, userTimezone, 'PPP');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add New Lesson
            <div className="flex items-center text-sm text-muted-foreground ml-auto">
              <Globe className="h-4 w-4 mr-1" />
              School TZ: {schoolTimezone || 'Loading...'}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student">Student</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={loading}>
              <SelectTrigger id="student">
                <SelectValue placeholder={loading ? "Loading students..." : "Select a student"} />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  {date ? formatDateForDisplay(date) : <span>Pick a date</span>}
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
            <Label htmlFor="time">
              Time (in {schoolTimezone || 'school timezone'})
            </Label>
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
            <p className="text-xs text-muted-foreground">
              Time will be created in school timezone ({schoolTimezone}) and displayed in your timezone ({userTimezone})
            </p>
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
          
          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost">Cost ($)</Label>
            <Input 
              id="cost" 
              type="number" 
              min="0" 
              placeholder="Enter lesson cost" 
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Create Lesson"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewLessonDialog;

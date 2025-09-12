
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Globe, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getCurrentUserInfo, getStudentsWithDetails } from '@/integrations/supabase/client';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import { formatInUserTimezone, getEffectiveTimezone } from '@/utils/timezone';
import { toZonedTime } from 'date-fns-tz';
import { validateTeacherScheduleOverlap } from '@/utils/teacherScheduleValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const isAdmin = user?.role === 'admin';
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [studentId, setStudentId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Use user timezone instead of school timezone
  const sessionTimezone = user?.timezone || 'Africa/Cairo';
  const [validationError, setValidationError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string>('');
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

        // No need to fetch school timezone - using user timezone
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, user?.schoolId]);

  // Clear validation error when form fields change
  useEffect(() => {
    if (validationError) {
      setValidationError('');
    }
  }, [date, studentId, time, duration]);

  // Validate teacher schedule when all required fields are filled
  useEffect(() => {
    const validateSchedule = async () => {
      if (!date || !studentId || !time || !duration || !students.length) {
        return;
      }

      const selectedStudent = students.find(s => s.id === studentId);
      if (!selectedStudent?.teacher_id) {
        return;
      }

      setIsValidating(true);
      setValidationError('');

      try {
        const durationMinutes = parseInt(duration.replace(' min', ''));
        const dateStr = format(date, 'yyyy-MM-dd');

        const result = await validateTeacherScheduleOverlap({
          teacherId: selectedStudent.teacher_id,
          date: dateStr,
          startTime: time,
          durationMinutes
        }, isAdmin);

        if (result.hasConflict && result.conflictMessage) {
          setValidationError(result.conflictMessage);
        }
      } catch (error) {
        console.error('Error validating schedule:', error);
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation to avoid too many API calls
    const timeoutId = setTimeout(validateSchedule, 500);
    return () => clearTimeout(timeoutId);
  }, [date, studentId, time, duration, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !studentId || !subject || !time || !duration || !user?.schoolId) {
      toast.error("Please fill out all required fields");
      return;
    }

    const selectedStudent = students.find(s => s.id === studentId);
    if (!selectedStudent) {
      toast.error("Selected student not found");
      return;
    }

    try {
      setLoading(true);

      // Final validation before submission
      if (selectedStudent.teacher_id) {
        const durationMinutes = parseInt(duration.replace(' min', ''));
        const dateStr = format(date, 'yyyy-MM-dd');

        const result = await validateTeacherScheduleOverlap({
          teacherId: selectedStudent.teacher_id,
          date: dateStr,
          startTime: time,
          durationMinutes
        }, isAdmin);

        if (result.hasConflict && result.conflictMessage) {
          setConflictMessage(result.conflictMessage);
          setShowConflictDialog(true);
          setLoading(false);
          return;
        }
      }

      // Create datetime in user timezone (Cairo)
      const [hours, minutes] = time.split(':').map(Number);
      const localDateTime = new Date(date);
      localDateTime.setHours(hours, minutes, 0, 0);
      
      // Parse duration
      const durationMinutes = parseInt(duration.replace(' min', ''));
      
      // Create lesson session in database - fix by adding subscription_id as null for standalone sessions
      const { error } = await supabase
        .from('lesson_sessions')
        .insert({
          student_id: studentId,
          subscription_id: null, // Add this required field for standalone sessions
          scheduled_date: (() => {
            // Format as YYYY-MM-DD HH:MM:SS in user timezone
            const year = localDateTime.getFullYear();
            const month = String(localDateTime.getMonth() + 1).padStart(2, '0');
            const day = String(localDateTime.getDate()).padStart(2, '0');
            const hour = String(localDateTime.getHours()).padStart(2, '0');
            const minute = String(localDateTime.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hour}:${minute}:00`;
          })(),
          duration_minutes: durationMinutes,
          status: 'scheduled',
          payment_status: 'pending',
          cost: cost ? parseFloat(cost) : 0,
          notes: `${subject} lesson - Created via calendar`
        });

      if (error) throw error;
      
      toast.success(`${subject} lesson with ${selectedStudent.first_name} ${selectedStudent.last_name} on ${format(date, 'MMM d')} at ${time} (${sessionTimezone})`);
      
      // Reset form and close dialog
      resetForm();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error creating lesson:', error);
      toast.error("Failed to create lesson");
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setDate(initialDate);
    setStudentId('');
    setSubject('');
    setTime('');
    setDuration('');
    setCost('');
    setValidationError('');
    setConflictMessage('');
  };

  // Format the selected date for display in user's timezone
  const formatDateForDisplay = (date: Date) => {
    return formatInUserTimezone(date, userTimezone, 'PPP');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Add New Lesson
              <div className="flex items-center text-sm text-muted-foreground ml-auto">
                <Globe className="h-4 w-4 mr-1" />
                Timezone: {sessionTimezone}
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
                Time (in {sessionTimezone})
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
                Sessions are created in your timezone ({sessionTimezone})
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

            {/* Enhanced Validation Error Alert */}
            {validationError && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800 font-medium">
                  {validationError}
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Loading */}
            {isValidating && (
              <Alert className="border-blue-200 bg-blue-50">
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-blue-800">
                  Checking teacher availability...
                </AlertDescription>
              </Alert>
            )}
            
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
              <Button 
                type="submit" 
                disabled={loading || isValidating || !!validationError}
                className={validationError ? "opacity-50 cursor-not-allowed" : ""}
              >
                {loading ? "Creating..." : isValidating ? "Validating..." : "Create Lesson"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Conflict Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Schedule Conflict Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left whitespace-pre-wrap">
              {conflictMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowConflictDialog(false)}>
              Choose Different Time
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NewLessonDialog;


import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User,
  CheckCircle,
  CalendarX,
  XCircle,
  CalendarDays,
  Pencil,
  Trash2,
  RefreshCw,
  Check
} from 'lucide-react';
import { Session } from '@/contexts/PaymentContext';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { usePayments } from '@/contexts/PaymentContext';
import { useToast } from '@/hooks/use-toast';

interface LessonDetailsDialogProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const subjectColorMap: Record<string, { bg: string, border: string, text: string }> = {
  'Mathematics': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  'Science': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  'English': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700' },
  'Physics': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  'Chemistry': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
  'Biology': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700' },
  'Geography': { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
  'Literature': { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700' },
  'History': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
  'Computer Science': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
  'default': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' }
};

const LessonDetailsDialog: React.FC<LessonDetailsDialogProps> = ({ 
  session, 
  open, 
  onOpenChange 
}) => {
  const { updateSessionStatus, rescheduleSession } = usePayments();
  const { toast } = useToast();

  if (!session) return null;

  // Parse subject from notes
  const noteParts = session.notes?.split(' ') || [];
  const subject = noteParts.length > 0 ? noteParts[0] : 'default';
  
  // Parse student name from notes
  const studentNameMatch = session.notes?.match(/with\s+(.*?)$/);
  const studentName = studentNameMatch ? studentNameMatch[1] : `Student ${session.id.slice(-1)}`;

  // Get colors for the subject
  const colors = subjectColorMap[subject] || subjectColorMap.default;

  // Format the date
  const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
  const formattedDate = format(sessionDate, 'EEEE, MMMM d, yyyy');

  // Handle session actions
  const handleAttend = () => {
    updateSessionStatus(session.id, "completed");
    toast({
      title: "Lesson marked as completed",
      description: `${subject} lesson with ${studentName} marked as attended.`
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    updateSessionStatus(session.id, "canceled");
    toast({
      title: "Lesson canceled",
      description: `${subject} lesson with ${studentName} has been canceled.`
    });
    onOpenChange(false);
  };

  const handleReschedule = () => {
    rescheduleSession(session.id);
    toast({
      title: "Lesson rescheduled",
      description: `${subject} lesson with ${studentName} has been rescheduled.`
    });
    onOpenChange(false);
  };

  // Render status badge
  const renderStatusBadge = (status: Session['status']) => {
    switch(status) {
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Scheduled</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Completed</Badge>;
      case "canceled":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">Canceled</Badge>;
      case "missed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Missed</Badge>;
      default:
        return null;
    }
  };

  // Render status icon
  const renderStatusIcon = (status: Session['status']) => {
    switch(status) {
      case "scheduled":
        return <CalendarDays className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "canceled":
        return <CalendarX className="h-4 w-4 text-orange-500" />;
      case "missed":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Determine if action buttons should be disabled
  const isActionDisabled = session.status !== "scheduled";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Avatar className={cn("h-10 w-10", colors.border)}>
              <AvatarFallback className={cn(colors.bg, colors.text)}>
                {subject.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">{subject} Lesson</DialogTitle>
              <DialogDescription>
                with {studentName}
              </DialogDescription>
            </div>
            <div className="ml-auto">
              {renderStatusBadge(session.status)}
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 border rounded-md p-3">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Date</div>
                <div className="text-sm text-muted-foreground">{formattedDate}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 border rounded-md p-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Time</div>
                <div className="text-sm text-muted-foreground">{session.time} ({session.duration})</div>
              </div>
            </div>
          </div>
          
          {/* Student Details */}
          <div className="flex items-center gap-2 border rounded-md p-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Student</div>
              <div className="text-sm text-muted-foreground">{studentName}</div>
            </div>
          </div>
          
          {/* Session Number */}
          {session.sessionNumber && session.totalSessions && (
            <div className="border rounded-md p-3">
              <div className="text-sm font-medium mb-1.5">Session Progress</div>
              <div className="h-2.5 w-full bg-gray-200 rounded-full">
                <div 
                  className="h-2.5 bg-primary rounded-full"
                  style={{ width: `${(session.sessionNumber / session.totalSessions) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 text-right">
                Session {session.sessionNumber} of {session.totalSessions}
              </div>
            </div>
          )}
          
          {/* Notes */}
          {session.notes && (
            <div className="border rounded-md p-3">
              <div className="text-sm font-medium">Notes</div>
              <div className="text-sm text-muted-foreground mt-1">{session.notes}</div>
            </div>
          )}

          {/* Action Buttons - New Section */}
          {session.status === "scheduled" && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Button 
                onClick={handleAttend} 
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Check className="h-4 w-4 mr-1" />
                Attend
              </Button>
              <Button 
                onClick={handleCancel} 
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                onClick={handleReschedule} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reschedule
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex sm:justify-between gap-2 flex-wrap pt-2">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-muted-foreground">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button size="sm" variant="outline" className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
          <Button size="sm" className="ml-auto" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LessonDetailsDialog;

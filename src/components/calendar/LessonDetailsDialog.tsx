
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCcw,
  Check,
  X,
  ArrowRight,
  FileText
} from 'lucide-react';
import { Session } from '@/contexts/PaymentContext';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { handleSessionAction } from '@/integrations/supabase/client';

interface LessonDetailsDialogProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionUpdate?: () => void;
}

interface SessionActionResponse {
  success: boolean;
  message?: string;
  new_session_id?: string;
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
  'General': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' },
  'default': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' }
};

const LessonDetailsDialog: React.FC<LessonDetailsDialogProps> = ({ 
  session, 
  open, 
  onOpenChange,
  onSessionUpdate
}) => {
  const navigate = useNavigate();
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!session) return null;

  // Extract subject from notes if available, otherwise default to 'General'
  const subject = session.notes?.includes('Mathematics') ? 'Mathematics' :
                 session.notes?.includes('Science') ? 'Science' :
                 session.notes?.includes('English') ? 'English' :
                 session.notes?.includes('Physics') ? 'Physics' :
                 session.notes?.includes('Chemistry') ? 'Chemistry' :
                 session.notes?.includes('Biology') ? 'Biology' :
                 session.notes?.includes('Geography') ? 'Geography' :
                 session.notes?.includes('Literature') ? 'Literature' :
                 session.notes?.includes('Computer Science') ? 'Computer Science' :
                 'General';
  
  // Use the real student name from the session data
  const studentName = session.studentName || 'Unknown Student';

  // Get colors for the subject
  const colors = subjectColorMap[subject] || subjectColorMap.default;

  // Format the date
  const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
  const formattedDate = format(sessionDate, 'EEEE, MMMM d, yyyy');

  // Handle session actions with proper backend integration
  const handleSessionActionClick = async (action: string, newDatetime?: Date) => {
    try {
      setActionLoading(action);
      
      const response = await handleSessionAction(
        session.id, 
        action, 
        newDatetime?.toISOString()
      );

      // Type cast the response to our expected format
      const typedResponse = response as unknown as SessionActionResponse;

      if (typedResponse.success) {
        toast.success(`Session ${action} successfully`);
        // Trigger refresh of sessions data and close dialog
        if (onSessionUpdate) {
          onSessionUpdate();
        }
        onOpenChange(false);
      } else {
        toast.error(typedResponse.message || `Failed to ${action} session`);
      }
    } catch (error) {
      console.error(`Error handling session action ${action}:`, error);
      toast.error(`Failed to ${action} session`);
    } finally {
      setActionLoading(null);
    }
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

  // Check if session actions should be shown (only for scheduled sessions)
  const canTakeActions = session.status === 'scheduled';
  const isLoading = actionLoading !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Avatar className={cn("h-10 w-10", colors.border)}>
              <AvatarFallback className={cn(colors.bg, colors.text)}>
                {studentName.split(' ').map(name => name.charAt(0)).join('').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">{studentName}</DialogTitle>
              <DialogDescription>
                {subject} Lesson
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

          {/* Status Change Button */}
          {canTakeActions && (
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-purple-500 text-purple-500 hover:bg-purple-50"
              onClick={() => setStatusChangeOpen(!statusChangeOpen)}
              disabled={isLoading}
            >
              <RefreshCcw className="h-4 w-4" />
              Change Status
            </Button>
          )}

          {/* Status Change Options - Only show when expanded and session is scheduled */}
          {statusChangeOpen && canTakeActions && (
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => handleSessionActionClick("attended")} 
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
                disabled={isLoading}
              >
                <Check className="h-4 w-4 mr-1" />
                {actionLoading === "attended" ? "..." : "Attend"}
              </Button>
              <Button 
                onClick={() => handleSessionActionClick("cancelled")} 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                {actionLoading === "cancelled" ? "..." : "Cancel"}
              </Button>
              <Button 
                onClick={() => handleSessionActionClick("moved")} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
                disabled={isLoading}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                {actionLoading === "moved" ? "..." : "Move"}
              </Button>
              <Button 
                onClick={() => handleSessionActionClick("rescheduled")} 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                {actionLoading === "rescheduled" ? "..." : "Reschedule"}
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex sm:justify-between gap-2 flex-wrap pt-2">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-primary"
              onClick={() => {
                navigate(`/session/${session.id}`);
                onOpenChange(false);
              }}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Session Details
            </Button>
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

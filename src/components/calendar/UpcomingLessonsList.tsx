
import React, { useState } from "react";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  DollarSign,
  Check,
  X,
  ArrowRight,
  CheckCircle,
  XCircle,
  CalendarX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Session, usePayments } from "@/contexts/PaymentContext";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

// Map subject names to colors
const subjectColorMap: Record<string, { bg: string, border: string, text: string }> = {
  'Mathematics': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  'Science': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  'English': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700' },
  'Physics': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  'Chemistry': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
  'Biology': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700' },
  'Geography': { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
  'Literature': { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700' },
  'Computer Science': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
  'default': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' }
};

interface SessionWithSubject extends Session {
  subject: string;
}

interface UpcomingLessonsListProps {
  searchQuery?: string;
}

const UpcomingLessonsList: React.FC<UpcomingLessonsListProps> = ({ searchQuery = "" }) => {
  const { sessions, updateSessionStatus, rescheduleSession } = usePayments();
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<SessionWithSubject | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);

  // Extract subject from notes and sort lessons by date
  const processedSessions = sessions
    .map(session => {
      // Extract subject from notes (e.g., "Mathematics lesson with Student 1")
      const noteParts = session.notes?.split(' ') || [];
      const subject = noteParts.length > 0 ? noteParts[0] : 'default';
      return { ...session, subject } as SessionWithSubject;
    })
    .filter(session => {
      // Filter by search query if provided
      if (!searchQuery) return true;
      return session.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Sort by date (earliest first)
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  // Split into upcoming and past sessions
  const today = new Date();
  const upcomingSessions = processedSessions.filter(
    session => session.status === "scheduled" && new Date(session.date) >= today
  );
  const pastSessions = processedSessions.filter(
    session => session.status !== "scheduled" || new Date(session.date) < today
  );

  // Get colors for a subject
  const getSubjectColors = (subject: string) => {
    return subjectColorMap[subject] || subjectColorMap.default;
  };

  // Handle session actions
  const handleCancelSession = () => {
    if (selectedSession) {
      updateSessionStatus(selectedSession.id, "canceled");
      toast({
        title: "Session cancelled",
        description: `Session on ${format(new Date(selectedSession.date), "MMMM d, yyyy")} has been cancelled.`,
      });
      setCancelDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const handleCompleteSession = () => {
    if (selectedSession) {
      updateSessionStatus(selectedSession.id, "completed");
      toast({
        title: "Session marked as completed",
        description: `Session on ${format(new Date(selectedSession.date), "MMMM d, yyyy")} has been marked as attended.`,
      });
      setCompleteDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const handleRescheduleSession = () => {
    if (selectedSession) {
      rescheduleSession(selectedSession.id);
      toast({
        title: "Session rescheduled",
        description: "Session has been moved to the next available date.",
      });
      setRescheduleDialogOpen(false);
      setSelectedSession(null);
    }
  };

  // Render status badge
  const renderStatusBadge = (status: Session['status']) => {
    switch(status) {
      case "scheduled":
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-500">
            <CalendarIcon className="h-3 w-3" />
            Scheduled
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-500">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-500">
            <CalendarX className="h-3 w-3" />
            Canceled
          </Badge>
        );
      case "missed":
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-red-500 text-red-500">
            <XCircle className="h-3 w-3" />
            Missed
          </Badge>
        );
    }
  };

  // Render payment badge
  const renderPaymentBadge = (session: Session) => {
    if (session.status === "canceled" && session.cost === 0) {
      return null;
    }
    
    return session.paymentStatus === "paid" ? (
      <Badge className="bg-green-500">Paid</Badge>
    ) : (
      <Badge className="bg-red-500">Unpaid</Badge>
    );
  };

  // Render session card
  const renderSessionCard = (session: SessionWithSubject) => {
    const colors = getSubjectColors(session.subject);
    const sessionDate = new Date(session.date);
    const isUpcoming = session.status === "scheduled" && sessionDate >= today;
    
    return (
      <Card 
        key={session.id} 
        className={cn(
          "mb-4 border-l-4 hover:shadow-md transition-shadow",
          colors.border
        )}
      >
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex gap-3 items-start">
              <Avatar className={cn("h-10 w-10 border", colors.border)}>
                <AvatarFallback className={cn(colors.bg, colors.text)}>
                  {session.subject.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <div className="flex flex-wrap gap-2 items-center">
                  <h3 className="font-medium">{session.subject}</h3>
                  <Badge variant="outline" className={cn(colors.bg, colors.text, colors.border, "border")}>
                    {session.notes?.split(' ')[0] || 'Lesson'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>{format(sessionDate, "EEE, MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{session.time} ({session.duration})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{session.notes?.split(' with ')[1] || `Student ${session.id.slice(-1)}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>${session.cost}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 items-start md:items-center">
              <div className="flex flex-wrap gap-2">
                {renderStatusBadge(session.status)}
                {renderPaymentBadge(session)}
              </div>
              
              {isUpcoming && (
                <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-green-500 text-green-500 hover:bg-green-50"
                    onClick={() => {
                      setSelectedSession(session);
                      setCompleteDialogOpen(true);
                    }}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Attended
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-red-500 text-red-500 hover:bg-red-50"
                    onClick={() => {
                      setSelectedSession(session);
                      setCancelDialogOpen(true);
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                  {session.subscriptionId && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-blue-500 text-blue-500 hover:bg-blue-50"
                      onClick={() => {
                        setSelectedSession(session);
                        setRescheduleDialogOpen(true);
                      }}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      Reschedule
                    </Button>
                  )}
                </div>
              )}
              
              {session.status === "canceled" && session.subscriptionId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-500 text-blue-500 hover:bg-blue-50 mt-2 md:mt-0"
                  onClick={() => {
                    setSelectedSession(session);
                    setRescheduleDialogOpen(true);
                  }}
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  Reschedule
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Upcoming Lessons</h2>
        {upcomingSessions.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No upcoming lessons found</p>
          </div>
        ) : (
          <div>
            {upcomingSessions.map(renderSessionCard)}
          </div>
        )}
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Past Lessons</h2>
        {pastSessions.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No past lessons found</p>
          </div>
        ) : (
          <div>
            {pastSessions.slice(0, 5).map(renderSessionCard)}
            {pastSessions.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline">
                  View all past lessons ({pastSessions.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Session Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep session</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSession}
              className="bg-red-500 hover:bg-red-600"
            >
              Yes, cancel session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Attended Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Attended</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure this session was attended? This will mark it as completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCompleteSession}
              className="bg-green-500 hover:bg-green-600"
            >
              Confirm Attendance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Session Dialog */}
      <AlertDialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reschedule Session</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to move this session to the next available date after the last scheduled session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRescheduleSession}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Reschedule Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UpcomingLessonsList;

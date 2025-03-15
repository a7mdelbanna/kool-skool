import React from "react";
import { format } from "date-fns";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  CalendarX,
  ArrowRight,
  Check,
  XCircle,
  RefreshCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Student } from "@/components/StudentCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePayments, Session } from "@/contexts/PaymentContext";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SessionsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
  isViewMode?: boolean;
}

const SessionsTab: React.FC<SessionsTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false 
}) => {
  const { sessions, updateSessionStatus, rescheduleSession } = usePayments();
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = React.useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = React.useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = React.useState(false);
  
  const upcomingSessions = sessions.filter(
    session => session.status === "scheduled" && new Date(session.date) >= new Date()
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const pastSessions = sessions.filter(
    session => session.status !== "scheduled" || new Date(session.date) < new Date()
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
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
    if (selectedSession && selectedSession.subscriptionId) {
      rescheduleSession(selectedSession.id);
      toast({
        title: "Session rescheduled",
        description: "Session has been moved to the next available date.",
      });
      setRescheduleDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const handleChangeStatus = (newStatus: Session['status']) => {
    if (selectedSession) {
      updateSessionStatus(selectedSession.id, newStatus);
      toast({
        title: "Status updated",
        description: `Session status has been changed to ${newStatus}.`,
      });
      setChangeStatusDialogOpen(false);
      setSelectedSession(null);
    }
  };
  
  const getStatusBadge = (session: Session) => {
    switch(session.status) {
      case "scheduled":
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-500">
            <Calendar className="h-3 w-3" />
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
            <X className="h-3 w-3" />
            Missed
          </Badge>
        );
      default:
        return null;
    }
  };
  
  const getPaymentBadge = (session: Session) => {
    if (session.status === "canceled" && session.cost === 0) {
      return null;
    }
    
    return session.paymentStatus === "paid" ? (
      <Badge variant="outline" className="border-green-500 text-green-500">
        Paid
      </Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500 text-amber-500">
        Unpaid
      </Badge>
    );
  };
  
  const renderSessionsList = (sessionsList: Session[], title: string) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{title}</h3>
      {sessionsList.length === 0 ? (
        <div className="text-center py-6 border rounded-md bg-muted/30">
          <p className="text-muted-foreground">No {title.toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessionsList.map((session) => (
            <div
              key={session.id}
              className={cn(
                "border rounded-md p-4",
                session.status === "canceled" && "bg-muted/30"
              )}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {format(new Date(session.date), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{session.time} • {session.duration}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {getStatusBadge(session)}
                  {getPaymentBadge(session)}
                </div>
              </div>
              
              {session.cost > 0 && (
                <div className="mt-2 text-sm">
                  <span className="font-medium">${session.cost.toFixed(2)}</span>
                </div>
              )}
              
              {session.notes && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {session.notes}
                </div>
              )}

              {!isViewMode && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {session.status === "scheduled" && (
                    <>
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
                        Mark as Attended
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
                        Cancel Session
                      </Button>
                    </>
                  )}
                  
                  {(session.status === "completed" || session.status === "canceled" || session.status === "missed") && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-purple-500 text-purple-500 hover:bg-purple-50"
                      onClick={() => {
                        setSelectedSession(session);
                        setChangeStatusDialogOpen(true);
                      }}
                    >
                      <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                      Change Status
                    </Button>
                  )}
                  
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
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {renderSessionsList(upcomingSessions, "Upcoming Sessions")}
      {renderSessionsList(pastSessions, "Past Sessions")}
      
      <div className="border-t pt-4 mt-6">
        <p className="text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 inline mr-1" />
          Sessions are automatically generated when you add a subscription in the Subscriptions tab.
        </p>
      </div>

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

      <Dialog open={changeStatusDialogOpen} onOpenChange={setChangeStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Session Status</DialogTitle>
            <DialogDescription>
              Select a new status for this session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Current Status: {selectedSession?.status}</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => handleChangeStatus("scheduled")}
                  variant="outline"
                  className="border-blue-500 text-blue-500 hover:bg-blue-50"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Mark as Scheduled
                </Button>
                <Button 
                  onClick={() => handleChangeStatus("completed")} 
                  variant="outline"
                  className="border-green-500 text-green-500 hover:bg-green-50"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Mark as Completed
                </Button>
                <Button 
                  onClick={() => handleChangeStatus("canceled")}
                  variant="outline" 
                  className="border-red-500 text-red-500 hover:bg-red-50"
                >
                  <CalendarX className="h-3.5 w-3.5 mr-1" />
                  Mark as Canceled
                </Button>
                <Button 
                  onClick={() => handleChangeStatus("missed")}
                  variant="outline"
                  className="border-amber-500 text-amber-500 hover:bg-amber-50"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Mark as Missed
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeStatusDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionsTab;

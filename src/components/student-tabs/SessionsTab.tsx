import React, { useState, useEffect } from "react";
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
import { getStudentLessonSessions, updateLessonSessionStatus } from "@/integrations/supabase/client";

interface SessionsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
  isViewMode?: boolean;
}

interface DatabaseSession {
  id: string;
  subscription_id: string;
  student_id: string;
  scheduled_date: string;
  duration_minutes: number | null;
  status: string;
  payment_status: string;
  cost: number;
  notes: string | null;
  created_at: string;
  index_in_sub?: number | null;
  counts_toward_completion?: boolean;
  original_session_index?: number | null;
  moved_from_session_id?: string | null;
}

const SessionsTab: React.FC<SessionsTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false 
}) => {
  const [sessions, setSessions] = useState<DatabaseSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = React.useState<DatabaseSession | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = React.useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = React.useState(false);
  
  // Load sessions when component mounts or studentData changes
  useEffect(() => {
    if (studentData.id) {
      loadSessions();
    }
  }, [studentData.id]);

  const loadSessions = async () => {
    if (!studentData.id) return;
    
    try {
      setLoading(true);
      console.log('=== LOADING SESSIONS WITH COMPREHENSIVE DATABASE STRUCTURE ===');
      console.log('Loading sessions for student:', studentData.id);
      
      const data = await getStudentLessonSessions(studentData.id);
      console.log('Raw sessions data received:', data);
      
      // Ensure data is an array and properly typed
      const sessionsArray = Array.isArray(data) ? data as DatabaseSession[] : [];
      
      // Comprehensive validation for the new database structure
      if (sessionsArray.length > 0) {
        console.log('=== VALIDATING SESSION DATA INTEGRITY WITH COMPREHENSIVE CHECKS ===');
        const uniqueCheck = new Map();
        const validSessions: DatabaseSession[] = [];
        
        sessionsArray.forEach((session, index) => {
          const dateKey = session.scheduled_date;
          console.log(`Session ${index + 1}:`, {
            id: session.id,
            scheduled_date: session.scheduled_date,
            notes: session.notes,
            index_in_sub: session.index_in_sub,
            status: session.status
          });
          
          if (uniqueCheck.has(dateKey)) {
            console.warn(`⚠️  DUPLICATE DETECTED: Session at ${dateKey} - This should not happen with comprehensive constraints`);
            // Don't add duplicates to the display
          } else {
            uniqueCheck.set(dateKey, session);
            validSessions.push(session);
          }
        });
        
        if (validSessions.length !== sessionsArray.length) {
          const duplicateCount = sessionsArray.length - validSessions.length;
          console.error(`❌ FOUND ${duplicateCount} DUPLICATE SESSIONS - Comprehensive database constraints may not be working`);
          toast({
            title: "Warning: Data Integrity Issue",
            description: `Found ${duplicateCount} duplicate session(s). Comprehensive database constraints should prevent this.`,
            variant: "destructive",
          });
        } else {
          console.log('✅ ALL SESSIONS ARE UNIQUE - Comprehensive database constraints working correctly');
        }
        
        setSessions(validSessions);
      } else {
        setSessions([]);
      }
      
      console.log(`✅ Successfully loaded ${sessionsArray.length} sessions with comprehensive validation`);
      console.log('=== END COMPREHENSIVE SESSION LOADING ===');
    } catch (error) {
      console.error('❌ Error loading sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load sessions. Please try refreshing.",
        variant: "destructive",
      });
      setSessions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSessions = async () => {
    console.log('=== COMPREHENSIVE MANUAL REFRESH TRIGGERED ===');
    setRefreshing(true);
    
    try {
      await loadSessions();
      toast({
        title: "Sessions Refreshed",
        description: "Session data has been updated successfully with comprehensive validation",
      });
    } catch (error) {
      console.error('Error during comprehensive manual refresh:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh session data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  const upcomingSessions = sessions.filter(
    session => session.status === "scheduled" && new Date(session.scheduled_date) >= new Date()
  ).sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
  
  const pastSessions = sessions.filter(
    session => session.status !== "scheduled" || new Date(session.scheduled_date) < new Date()
  ).sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  
  const handleUpdateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      setLoading(true);
      console.log(`🎯 Updating session ${sessionId} with action for status: ${newStatus}`);
      
      // Map status to appropriate action
      let action: string;
      switch (newStatus) {
        case 'completed':
          action = 'attended';
          break;
        case 'cancelled':
          action = 'cancelled';
          break;
        case 'scheduled':
          action = 'rescheduled';
          break;
        default:
          throw new Error(`Unsupported status: ${newStatus}`);
      }
      
      const result = await handleSessionAction(sessionId, action);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message || `Session ${action} successfully`,
        });
        
        // Reload sessions to reflect changes including any new sessions created
        await loadSessions();
      } else {
        throw new Error(result.message || 'Session action failed');
      }
    } catch (error) {
      console.error('❌ Error handling session action:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSession = async (sessionId: string) => {
    try {
      setLoading(true);
      console.log(`🔄 Moving session ${sessionId} to next available slot`);
      
      const result = await handleSessionAction(sessionId, 'moved');
      
      if (result.success) {
        toast({
          title: "Session Moved",
          description: result.message + (result.new_session_id ? ' New session created.' : ''),
        });
        
        // Reload sessions to show both the moved session and new session
        await loadSessions();
      } else {
        throw new Error(result.message || 'Failed to move session');
      }
    } catch (error) {
      console.error('❌ Error moving session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = () => {
    if (selectedSession) {
      handleUpdateSessionStatus(selectedSession.id, "cancelled");
      setCancelDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const handleCompleteSession = () => {
    if (selectedSession) {
      handleUpdateSessionStatus(selectedSession.id, "completed");
      setCompleteDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const handleChangeStatus = (newStatus: string) => {
    if (selectedSession) {
      handleUpdateSessionStatus(selectedSession.id, newStatus);
      setChangeStatusDialogOpen(false);
      setSelectedSession(null);
    }
  };
  
  const getStatusBadge = (session: DatabaseSession) => {
    const getBadgeContent = () => {
      switch(session.status) {
        case "scheduled":
          return {
            icon: <Calendar className="h-3 w-3" />,
            text: "Scheduled",
            className: "border-blue-500 text-blue-500"
          };
        case "completed":
          return {
            icon: <CheckCircle className="h-3 w-3" />,
            text: "Completed",
            className: "border-green-500 text-green-500"
          };
        case "cancelled":
          return {
            icon: <CalendarX className="h-3 w-3" />,
            text: "Cancelled",
            className: "border-orange-500 text-orange-500"
          };
        case "rescheduled":
          return {
            icon: <ArrowRight className="h-3 w-3" />,
            text: session.moved_from_session_id ? "Moved" : "Rescheduled",
            className: "border-purple-500 text-purple-500"
          };
        default:
          return null;
      }
    };

    const badgeContent = getBadgeContent();
    if (!badgeContent) return null;

    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${badgeContent.className}`}>
        {badgeContent.icon}
        {badgeContent.text}
        {!session.counts_toward_completion && (
          <span className="text-xs opacity-70">(replaced)</span>
        )}
      </Badge>
    );
  };
  
  const getPaymentBadge = (session: DatabaseSession) => {
    if (session.status === "cancelled" && session.cost === 0) {
      return null;
    }
    
    return session.payment_status === "paid" ? (
      <Badge variant="outline" className="border-green-500 text-green-500">
        Paid
      </Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500 text-amber-500">
        {session.payment_status === "pending" ? "Pending" : "Overdue"}
      </Badge>
    );
  };
  
  const renderSessionsList = (sessionsList: DatabaseSession[], title: string) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshSessions}
          disabled={loading || refreshing}
          className="gap-2"
        >
          <RefreshCcw className={`h-4 w-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      {sessionsList.length === 0 ? (
        <div className="text-center py-6 border rounded-md bg-muted/30">
          <p className="text-muted-foreground">No {title.toLowerCase()}</p>
          {title === "Upcoming Sessions" && (
            <p className="text-xs text-muted-foreground mt-2">
              Sessions will appear here after adding a subscription
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sessionsList.map((session) => (
            <div
              key={session.id}
              className={cn(
                "border rounded-md p-4",
                (session.status === "cancelled" || !session.counts_toward_completion) && "bg-muted/30"
              )}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {format(new Date(session.scheduled_date), "EEEE, MMMM d, yyyy")}
                    </span>
                    {session.index_in_sub && (
                      <Badge variant="secondary" className="text-xs">
                        #{session.original_session_index || session.index_in_sub}
                      </Badge>
                    )}
                    {session.moved_from_session_id && (
                      <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                        Replacement
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(session.scheduled_date), "HH:mm")} • {session.duration_minutes || 60} min</span>
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
                        disabled={loading}
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
                        disabled={loading}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel Session
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-blue-500 text-blue-500 hover:bg-blue-50"
                        onClick={() => handleMoveSession(session.id)}
                        disabled={loading}
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1" />
                        Move to End
                      </Button>
                    </>
                  )}
                  
                  {(session.status === "completed" || session.status === "cancelled" || session.status === "rescheduled") && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-purple-500 text-purple-500 hover:bg-purple-50"
                      onClick={() => {
                        setSelectedSession(session);
                        setChangeStatusDialogOpen(true);
                      }}
                      disabled={loading}
                    >
                      <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                      Change Status
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

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading sessions with comprehensive validation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderSessionsList(upcomingSessions, "Upcoming Sessions")}
      {renderSessionsList(pastSessions, "Past Sessions")}
      
      <div className="border-t pt-4 mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            Sessions are automatically generated when you add a subscription. Use actions to manage attendance and scheduling.
          </p>
          <p className="text-xs text-muted-foreground">
            Total sessions: {sessions.length} | Session actions: Attend, Cancel, Move ✅
          </p>
        </div>
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
                  onClick={() => handleChangeStatus("cancelled")}
                  variant="outline" 
                  className="border-red-500 text-red-500 hover:bg-red-50"
                >
                  <CalendarX className="h-3.5 w-3.5 mr-1" />
                  Mark as Cancelled
                </Button>
                <Button 
                  onClick={() => handleChangeStatus("rescheduled")}
                  variant="outline"
                  className="border-purple-500 text-purple-500 hover:bg-purple-50"
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  Mark as Rescheduled
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

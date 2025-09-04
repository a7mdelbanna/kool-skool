
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
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
  RefreshCcw,
  CalendarClock,
  Eye,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Student } from "@/components/StudentCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { handleSessionAction } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";

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
  scheduled_time?: string;
  scheduled_datetime?: string;
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

interface SubscriptionInfo {
  id: string;
  session_count: number;
  duration_months: number;
  start_date: string;
  end_date: string | null;
  total_price: number;
  currency: string;
  status: string;
  schedule: any;
  notes: string | null;
  sessions: DatabaseSession[];
}

interface SessionActionResponse {
  success: boolean;
  message: string;
  new_session_id?: string;
}

const SessionsTab: React.FC<SessionsTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false 
}) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedSession, setSelectedSession] = React.useState<DatabaseSession | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = React.useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = React.useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = React.useState(false);
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleTime, setRescheduleTime] = React.useState("");
  
  // Load sessions when component mounts or studentData changes
  useEffect(() => {
    if (studentData.id) {
      loadSubscriptionsWithSessions();
    }
  }, [studentData.id]);

  const loadSubscriptionsWithSessions = async () => {
    if (!studentData.id) return;
    
    try {
      setLoading(true);
      console.log('=== SESSIONS TAB: LOADING SUBSCRIPTIONS WITH SESSIONS ===');
      console.log('Student ID:', studentData.id);
      
      // Get all subscriptions for the student
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .rpc('get_student_subscriptions', { 
          p_student_id: studentData.id 
        });

      console.log('=== SESSIONS TAB: SUBSCRIPTION RPC RESULT ===');
      console.log('Error:', subscriptionError);
      console.log('Data:', subscriptionData);
      console.log('Subscription count:', subscriptionData?.length || 0);

      if (subscriptionError) {
        console.error('❌ SESSIONS TAB: Error loading subscriptions:', subscriptionError);
        toast({
          title: "Error",
          description: `Failed to load subscriptions: ${subscriptionError.message}`,
          variant: "destructive",
        });
        setSubscriptions([]);
        return;
      }

      if (!subscriptionData || subscriptionData.length === 0) {
        console.log('⚠️ SESSIONS TAB: No subscriptions found for student');
        setSubscriptions([]);
        return;
      }

      // Get ALL sessions for the student (regardless of subscription)
      console.log('=== SESSIONS TAB: LOADING ALL SESSIONS ===');
      const { data: sessionsData, error: sessionsError } = await supabase
        .rpc('get_lesson_sessions', { 
          p_student_id: studentData.id 
        });

      console.log('=== SESSIONS TAB: SESSIONS RPC RESULT ===');
      console.log('Sessions error:', sessionsError);
      console.log('Sessions data:', sessionsData);
      console.log('Sessions count:', sessionsData?.length || 0);

      if (sessionsError) {
        console.error('❌ SESSIONS TAB: Error loading sessions:', sessionsError);
        toast({
          title: "Error",
          description: `Failed to load sessions: ${sessionsError.message}`,
          variant: "destructive",
        });
        setSubscriptions([]);
        return;
      }

      const sessionsArray = Array.isArray(sessionsData) ? sessionsData as DatabaseSession[] : [];
      
      // Create a map of all subscription IDs that exist in sessions
      const sessionSubscriptionIds = new Set(sessionsArray.map(session => session.subscription_id));
      
      console.log('=== SESSIONS TAB: SESSION SUBSCRIPTION IDs ===');
      console.log('Unique subscription IDs in sessions:', Array.from(sessionSubscriptionIds));
      
      // Group sessions by subscription, but include ALL subscriptions even if they don't have sessions
      const subscriptionsWithSessions: SubscriptionInfo[] = subscriptionData.map(sub => {
        console.log(`\n🔍 SESSIONS TAB: Processing subscription: ${sub.id}`);
        console.log(`   Subscription ID type: ${typeof sub.id}`);
        
        // Filter sessions for this specific subscription
        const subscriptionSessions = sessionsArray.filter(session => {
          const matches = session.subscription_id === sub.id;
          console.log(`   Session ${session.id}: ${matches ? '✅' : '❌'} matches subscription ${sub.id}`);
          return matches;
        });
        
        console.log(`✅ SESSIONS TAB: Found ${subscriptionSessions.length} sessions for subscription ${sub.id}`);
        
        return {
          id: sub.id,
          session_count: sub.session_count,
          duration_months: sub.duration_months,
          start_date: sub.start_date,
          end_date: sub.end_date,
          total_price: sub.total_price,
          currency: sub.currency,
          status: sub.status,
          schedule: sub.schedule,
          notes: sub.notes,
          sessions: subscriptionSessions
        };
      });

      // Also create virtual subscriptions for any sessions that don't match existing subscriptions
      // This handles cases where sessions exist for old/deleted subscriptions
      const orphanedSessions = sessionsArray.filter(session => 
        !subscriptionData.some(sub => sub.id === session.subscription_id)
      );
      
      if (orphanedSessions.length > 0) {
        console.log('=== SESSIONS TAB: HANDLING ORPHANED SESSIONS ===');
        console.log(`Found ${orphanedSessions.length} orphaned sessions`);
        
        // Group orphaned sessions by subscription_id
        const orphanedBySubscription = orphanedSessions.reduce((acc, session) => {
          const subId = session.subscription_id;
          if (!acc[subId]) {
            acc[subId] = [];
          }
          acc[subId].push(session);
          return acc;
        }, {} as Record<string, DatabaseSession[]>);
        
        // Create virtual subscriptions for orphaned sessions
        Object.entries(orphanedBySubscription).forEach(([subId, sessions]) => {
          console.log(`Creating virtual subscription for ${subId} with ${sessions.length} sessions`);
          
          subscriptionsWithSessions.push({
            id: subId,
            session_count: sessions.length,
            duration_months: 1, // Default value
            start_date: sessions[0]?.scheduled_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            end_date: null,
            total_price: sessions.reduce((sum, s) => sum + (s.cost || 0), 0),
            currency: 'USD',
            status: 'completed', // Assuming these are from completed subscriptions
            schedule: null,
            notes: 'Legacy/Renewed subscription sessions',
            sessions: sessions
          });
        });
      }

      console.log('=== SESSIONS TAB: FINAL RESULT ===');
      console.log(`Total subscription groups: ${subscriptionsWithSessions.length}`);
      subscriptionsWithSessions.forEach((sub, index) => {
        console.log(`Group ${index + 1} (${sub.id}): ${sub.sessions.length} sessions`);
      });

      setSubscriptions(subscriptionsWithSessions);
      console.log('=== SESSIONS TAB: LOAD COMPLETE ===');
      
    } catch (error) {
      console.error('❌ SESSIONS TAB: Critical error:', error);
      toast({
        title: "Error",
        description: "Failed to load sessions. Please try refreshing.",
        variant: "destructive",
      });
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSessions = async () => {
    console.log('=== SESSIONS TAB: MANUAL REFRESH TRIGGERED ===');
    setRefreshing(true);
    
    try {
      await loadSubscriptionsWithSessions();
      toast({
        title: "Sessions Refreshed",
        description: "Session data has been updated successfully",
      });
    } catch (error) {
      console.error('SESSIONS TAB: Error during manual refresh:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh session data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      setLoading(true);
      console.log(`🎯 Updating session ${sessionId} with status change to: ${newStatus}`);
      
      if (newStatus === 'scheduled') {
        const { error } = await supabase
          .from('lesson_sessions')
          .update({ 
            status: 'scheduled',
            counts_toward_completion: true
          })
          .eq('id', sessionId);
        
        if (error) {
          console.error('❌ Error updating session status:', error);
          throw error;
        }
        
        toast({
          title: "Success",
          description: "Session status updated to scheduled successfully",
        });
      } else {
        let action: string;
        switch (newStatus) {
          case 'completed':
            action = 'attended';
            break;
          case 'cancelled':
            action = 'cancelled';
            break;
          default:
            throw new Error(`Unsupported status: ${newStatus}`);
        }
        
        const rawResult = await handleSessionAction(sessionId, action);
        const result = rawResult as unknown as SessionActionResponse;
        
        if (result.success) {
          toast({
            title: "Success",
            description: result.message || `Session ${action} successfully`,
          });
        } else {
          throw new Error(result.message || 'Session action failed');
        }
      }
      
      await loadSubscriptionsWithSessions();
    } catch (error) {
      console.error('❌ Error handling session status update:', error);
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
      
      const rawResult = await handleSessionAction(sessionId, 'moved');
      const result = rawResult as unknown as SessionActionResponse;
      
      if (result.success) {
        toast({
          title: "Session Moved",
          description: result.message + (result.new_session_id ? ' New session created.' : ''),
        });
        
        await loadSubscriptionsWithSessions();
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

  const handleRescheduleSession = async () => {
    if (!selectedSession || !rescheduleDate || !rescheduleTime) {
      toast({
        title: "Error",
        description: "Please select both date and time for rescheduling",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const newDateTime = `${rescheduleDate}T${rescheduleTime}:00`;
      console.log(`📅 Rescheduling session ${selectedSession.id} to ${newDateTime}`);
      
      const rawResult = await handleSessionAction(selectedSession.id, 'rescheduled', newDateTime);
      const result = rawResult as unknown as SessionActionResponse;
      
      if (result.success) {
        toast({
          title: "Session Rescheduled",
          description: result.message || "Session has been rescheduled successfully",
        });
        
        await loadSubscriptionsWithSessions();
        setRescheduleDialogOpen(false);
        setSelectedSession(null);
        setRescheduleDate("");
        setRescheduleTime("");
      } else {
        throw new Error(result.message || 'Failed to reschedule session');
      }
    } catch (error) {
      console.error('❌ Error rescheduling session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reschedule session",
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
        {session.counts_toward_completion === false && session.status !== 'cancelled' && (
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

  const formatSchedule = (schedule: any) => {
    try {
      if (typeof schedule === 'string') {
        const parsed = JSON.parse(schedule);
        return Array.isArray(parsed) 
          ? parsed.map(s => `${s.day} at ${s.time}`).join(', ')
          : schedule;
      }
      if (Array.isArray(schedule)) {
        return schedule.map(s => `${s.day} at ${s.time}`).join(', ');
      }
      return JSON.stringify(schedule);
    } catch {
      return schedule?.toString() || 'No schedule';
    }
  };

  const handleOpenSessionDetails = (sessionId: string, event?: React.MouseEvent) => {
    // Check if we're in a modal context by looking for dialog elements
    const isInModal = document.querySelector('[role="dialog"]') !== null;
    
    if (isInModal) {
      // Open in new tab when inside a modal to avoid closing the modal
      if (event) {
        event.stopPropagation();
      }
      window.open(`/session/${sessionId}`, '_blank');
    } else {
      // Navigate normally when not in a modal
      navigate(`/session/${sessionId}`);
    }
  };

  const renderSession = (session: DatabaseSession) => (
    <div
      key={session.id}
      className={cn(
        "border rounded-md p-4 mb-3 relative group transition-colors hover:border-primary/50",
        (session.status === "cancelled" || !session.counts_toward_completion) && "bg-muted/30"
      )}
    >
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex-1">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => handleOpenSessionDetails(session.id, e)}
            title="Click to view session details (opens in new tab)"
          >
            <span className="font-medium underline-offset-4 hover:underline decoration-primary/50">
              {(() => {
                // Use scheduled_datetime if available, otherwise combine date and time
                let sessionDateTime: Date;
                
                if (session.scheduled_datetime) {
                  // Use the full datetime if available (already in correct timezone)
                  sessionDateTime = new Date(session.scheduled_datetime);
                } else if (session.scheduled_time) {
                  // Combine date and time in Cairo timezone
                  const dateStr = session.scheduled_date;
                  const timeStr = session.scheduled_time;
                  
                  // Parse the date as local Cairo time
                  const [year, month, day] = dateStr.split('-').map(Number);
                  const [hours, minutes] = timeStr.split(':').map(Number);
                  
                  // Create date in local timezone (which should be Cairo)
                  sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
                } else {
                  // Fallback to just the date (should not happen with new data)
                  sessionDateTime = new Date(session.scheduled_date);
                }
                
                return format(sessionDateTime, "EEEE, MMMM d, yyyy");
              })()}
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
            <span>
              {(() => {
                // Use scheduled_datetime if available, otherwise combine date and time
                let sessionDateTime: Date;
                
                if (session.scheduled_datetime) {
                  // Use the full datetime if available (already in correct timezone)
                  sessionDateTime = new Date(session.scheduled_datetime);
                } else if (session.scheduled_time) {
                  // Combine date and time in Cairo timezone
                  const dateStr = session.scheduled_date;
                  const timeStr = session.scheduled_time;
                  
                  // Parse the date as local Cairo time
                  const [year, month, day] = dateStr.split('-').map(Number);
                  const [hours, minutes] = timeStr.split(':').map(Number);
                  
                  // Create date in local timezone (which should be Cairo)
                  sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
                } else {
                  // Fallback to just the date (should not happen with new data)
                  sessionDateTime = new Date(session.scheduled_date);
                }
                
                return format(sessionDateTime, "HH:mm");
              })()} • {session.duration_minutes || 60} min
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-medium border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
            onClick={(e) => handleOpenSessionDetails(session.id, e)}
            title="View session details (opens in new tab)"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Details
          </Button>
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
          {/* Parse and format the original date if it exists in notes */}
          {(() => {
            const match = session.notes.match(/\[(?:Moved|Rescheduled) from (\d{4}-\d{2}-\d{2})\]/);
            if (match && match[1]) {
              try {
                const originalDate = new Date(match[1]);
                return `[${session.status === 'rescheduled' && session.moved_from_session_id ? 'Moved' : 'Rescheduled'} from ${format(originalDate, "EEEE, MMMM d, yyyy")}]`;
              } catch {
                return session.notes;
              }
            }
            return session.notes;
          })()}
        </div>
      )}

      {!isViewMode && (
        <div className="mt-3 flex flex-wrap gap-2">
          {session.status === "scheduled" && (
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-green-500 text-green-500 hover:bg-green-50 flex-1"
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
                className="border-red-500 text-red-500 hover:bg-red-50 flex-1"
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
                className="border-orange-500 text-orange-500 hover:bg-orange-50 flex-1"
                onClick={() => {
                  setSelectedSession(session);
                  setRescheduleDialogOpen(true);
                }}
                disabled={loading}
              >
                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                Reschedule
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-blue-500 text-blue-500 hover:bg-blue-50 flex-1"
                onClick={() => handleMoveSession(session.id)}
                disabled={loading}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                Move
              </Button>
            </div>
          )}
          
          {(session.status === "completed" || session.status === "cancelled" || session.status === "rescheduled") && (
            <div className="flex gap-2 w-full flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-purple-500 text-purple-500 hover:bg-purple-50 flex-1"
                onClick={() => {
                  setSelectedSession(session);
                  setChangeStatusDialogOpen(true);
                }}
                disabled={loading}
              >
                <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                Change Status
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-orange-500 text-orange-500 hover:bg-orange-50 flex-1"
                onClick={() => {
                  setSelectedSession(session);
                  setRescheduleDialogOpen(true);
                }}
                disabled={loading}
              >
                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                Reschedule
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (loading && subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading sessions grouped by subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Sessions by Subscription</h3>
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

      {subscriptions.length === 0 ? (
        <div className="text-center py-6 border rounded-md bg-muted/30">
          <p className="text-muted-foreground">No subscriptions found</p>
          <p className="text-xs text-muted-foreground mt-2">
            Sessions will appear here after adding a subscription
          </p>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={subscriptions.map(sub => sub.id)} className="space-y-4">
          {subscriptions.map((subscription) => {
            const completedSessions = subscription.sessions.filter(s => 
              s.status === 'completed' && s.counts_toward_completion
            ).length;
            
            const upcomingSessions = subscription.sessions.filter(s => 
              s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date()
            ).length;

            // Check if this is a legacy/orphaned subscription
            const isLegacySubscription = subscription.notes?.includes('Legacy/Renewed');

            console.log(`🎨 SESSIONS TAB: Rendering subscription ${subscription.id}:`, {
              sessionsToRender: subscription.sessions.length,
              completed: completedSessions,
              upcoming: upcomingSessions,
              isLegacy: isLegacySubscription
            });

            return (
              <AccordionItem key={subscription.id} value={subscription.id} className="border rounded-lg">
                <Card>
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="text-left">
                        <CardTitle className="text-base font-medium">
                          {isLegacySubscription ? (
                            <>Legacy Sessions ({subscription.session_count} sessions)</>
                          ) : (
                            <>{subscription.session_count} Sessions - {subscription.duration_months} Month{subscription.duration_months !== 1 ? 's' : ''}</>
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(subscription.start_date), 'MMMM dd, yyyy')} - {subscription.currency} {subscription.total_price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-green-600">{completedSessions}</div>
                          <div className="text-xs text-muted-foreground">Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">{upcomingSessions}</div>
                          <div className="text-xs text-muted-foreground">Upcoming</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{subscription.sessions.length}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <Badge variant="outline" className={
                          subscription.status === 'active' ? 'border-green-300 text-green-700' :
                          subscription.status === 'paused' ? 'border-yellow-300 text-yellow-700' :
                          subscription.status === 'completed' ? 'border-blue-300 text-blue-700' :
                          'border-red-300 text-red-700'
                        }>
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent>
                    <CardContent className="pt-0">
                      <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                        <h5 className="font-medium mb-2">Subscription Details</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Schedule:</span>
                            <p>{formatSchedule(subscription.schedule)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <p>{subscription.start_date} to {subscription.end_date || 'Ongoing'}</p>
                          </div>
                        </div>
                        {subscription.notes && (
                          <div className="mt-2">
                            <span className="text-muted-foreground">Notes:</span>
                            <p className="text-sm">{subscription.notes}</p>
                          </div>
                        )}
                        {isLegacySubscription && (
                          <div className="mt-2">
                            <Badge variant="outline" className="border-orange-300 text-orange-700">
                              Legacy/Renewed Subscription Sessions
                            </Badge>
                          </div>
                        )}
                      </div>

                      {subscription.sessions.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <p>No sessions found for this subscription</p>
                          <p className="text-xs mt-1">Subscription ID: {subscription.id}</p>
                        </div>
                      ) : (
                        <div className="space-y-0">
                          {subscription.sessions
                            .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                            .map(renderSession)}
                        </div>
                      )}
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
      
      <div className="border-t pt-4 mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            Sessions are displayed for all subscriptions, including renewed ones. Use actions to manage attendance and scheduling.
          </p>
          <p className="text-xs text-muted-foreground">
            Total sessions: {subscriptions.reduce((total, sub) => total + sub.sessions.length, 0)} | Shows ALL sessions regardless of renewal status ✅
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

      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Session</DialogTitle>
            <DialogDescription>
              Select a new date and time for this session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reschedule-date" className="text-right">
                Date
              </Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reschedule-time" className="text-right">
                Time
              </Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRescheduleSession} disabled={loading}>
              {loading ? 'Rescheduling...' : 'Reschedule Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeStatusDialogOpen} onOpenChange={setChangeStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Session Status</DialogTitle>
            <DialogDescription>
              Select a new status for this session, or reschedule it to a new date and time.
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
                  onClick={() => {
                    setChangeStatusDialogOpen(false);
                    setRescheduleDialogOpen(true);
                  }}
                  variant="outline"
                  className="border-orange-500 text-orange-500 hover:bg-orange-50"
                >
                  <CalendarClock className="h-3.5 w-3.5 mr-1" />
                  Reschedule Session
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

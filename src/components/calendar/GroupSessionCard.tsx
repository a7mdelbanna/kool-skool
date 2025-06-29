
import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Users,
  CheckCircle, 
  CalendarX, 
  XCircle,
  CalendarDays,
  Check,
  X,
  CalendarClock,
  ArrowRight,
  RefreshCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Session } from '@/contexts/PaymentContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface GroupSessionCardProps {
  groupSession: {
    id: string;
    date: Date;
    time: string;
    duration: string;
    groupName?: string;
    sessions: Session[];
  };
  onSessionAction: (sessionId: string, action: string) => void;
  className?: string;
}

const GroupSessionCard: React.FC<GroupSessionCardProps> = ({ 
  groupSession, 
  onSessionAction,
  className 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const allSessionsCompleted = groupSession.sessions.every(s => s.status === 'completed');
  const allSessionsScheduled = groupSession.sessions.every(s => s.status === 'scheduled');
  const hasScheduledSessions = groupSession.sessions.some(s => s.status === 'scheduled');

  const getStatusIcon = (status: Session['status']) => {
    switch(status) {
      case "scheduled":
        return <CalendarDays className="h-3 w-3 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "canceled":
        return <CalendarX className="h-3 w-3 text-orange-500" />;
      case "missed":
        return <XCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const getStatusBadge = (status: Session['status']) => {
    const statusConfig = {
      scheduled: { className: "border-blue-500 text-blue-500", text: "Scheduled" },
      completed: { className: "border-green-500 text-green-500", text: "Completed" },
      canceled: { className: "border-orange-500 text-orange-500", text: "Cancelled" },
      missed: { className: "border-red-500 text-red-500", text: "Missed" }
    };

    const config = statusConfig[status];
    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${config.className}`}>
        {getStatusIcon(status)}
        {config.text}
      </Badge>
    );
  };

  const handleSessionAction = async (sessionId: string, action: string) => {
    setLoadingActions(prev => new Set(prev).add(sessionId));
    try {
      await onSessionAction(sessionId, action);
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const handleGroupAction = async (action: string) => {
    const scheduledSessions = groupSession.sessions.filter(s => s.status === 'scheduled');
    
    for (const session of scheduledSessions) {
      await handleSessionAction(session.id, action);
    }
  };

  const getGroupStatusSummary = () => {
    const statusCounts = groupSession.sessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => (
      <div key={status} className="flex items-center gap-1 text-xs">
        {getStatusIcon(status as Session['status'])}
        <span>{count} {status}</span>
      </div>
    ));
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold">
                Group Session
              </CardTitle>
              {groupSession.groupName && (
                <Badge variant="secondary">{groupSession.groupName}</Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(groupSession.date, 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {groupSession.time} • {groupSession.duration}
              </div>
            </div>
            
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{groupSession.sessions.length} students</span>
            </div>
            <div className="flex items-center gap-3">
              {getGroupStatusSummary()}
            </div>
          </div>
          
          {hasScheduledSessions && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-green-500 text-green-500 hover:bg-green-50"
                onClick={() => handleGroupAction('completed')}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark All Attended
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-red-500 text-red-500 hover:bg-red-50"
                onClick={() => handleGroupAction('canceled')}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel All
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {groupSession.sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "border rounded-md p-3",
                    session.status === "canceled" && "bg-muted/30 opacity-75"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {session.studentName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{session.studentName}</div>
                        {session.sessionNumber && session.totalSessions && (
                          <div className="text-xs text-muted-foreground">
                            Session {session.sessionNumber}/{session.totalSessions}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(session.status)}
                      
                      {session.status === 'scheduled' && (
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-green-500 text-green-500 hover:bg-green-50 h-7 px-2"
                            onClick={() => handleSessionAction(session.id, 'completed')}
                            disabled={loadingActions.has(session.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-500 text-red-500 hover:bg-red-50 h-7 px-2"
                            onClick={() => handleSessionAction(session.id, 'canceled')}
                            disabled={loadingActions.has(session.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {(session.status === 'completed' || session.status === 'canceled') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-purple-500 text-purple-500 hover:bg-purple-50 h-7 px-2"
                          onClick={() => handleSessionAction(session.id, 'scheduled')}
                          disabled={loadingActions.has(session.id)}
                        >
                          <RefreshCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {session.notes && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {session.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default GroupSessionCard;

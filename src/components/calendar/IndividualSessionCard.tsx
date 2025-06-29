
import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User,
  CheckCircle, 
  CalendarX, 
  XCircle,
  CalendarDays,
  Check,
  X,
  CalendarClock,
  ArrowRight,
  RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Session } from '@/contexts/PaymentContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface IndividualSessionCardProps {
  session: Session;
  onSessionAction: (sessionId: string, action: string) => void;
  className?: string;
}

const IndividualSessionCard: React.FC<IndividualSessionCardProps> = ({ 
  session, 
  onSessionAction,
  className 
}) => {
  const [loading, setLoading] = useState(false);

  const getStatusIcon = (status: Session['status']) => {
    switch(status) {
      case "scheduled":
        return <CalendarDays className="h-3 w-3 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "canceled":
      case "cancelled":
        return <CalendarX className="h-3 w-3 text-orange-500" />;
      case "missed":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <CalendarDays className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: Session['status']) => {
    const statusConfig = {
      scheduled: { className: "border-blue-500 text-blue-500", text: "Scheduled" },
      completed: { className: "border-green-500 text-green-500", text: "Completed" },
      canceled: { className: "border-orange-500 text-orange-500", text: "Cancelled" },
      cancelled: { className: "border-orange-500 text-orange-500", text: "Cancelled" },
      missed: { className: "border-red-500 text-red-500", text: "Missed" }
    };

    const config = statusConfig[status] || { className: "border-gray-500 text-gray-500", text: "Unknown" };
    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${config.className}`}>
        {getStatusIcon(status)}
        {config.text}
      </Badge>
    );
  };

  const handleSessionAction = async (action: string) => {
    setLoading(true);
    try {
      await onSessionAction(session.id, action);
    } finally {
      setLoading(false);
    }
  };

  const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);

  return (
    <Card className={cn("overflow-hidden", className, (session.status === "canceled" || session.status === "cancelled") && "bg-muted/30")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {session.studentName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                {session.studentName}
              </CardTitle>
              {session.sessionNumber && session.totalSessions && (
                <div className="text-sm text-muted-foreground mt-1">
                  Session {session.sessionNumber}/{session.totalSessions}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(sessionDate, 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {session.time} • {session.duration}
              </div>
            </div>
            {getStatusBadge(session.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {session.notes && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">{session.notes}</div>
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          {session.status === 'scheduled' && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-green-500 text-green-500 hover:bg-green-50"
                onClick={() => handleSessionAction('completed')}
                disabled={loading}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark as Attended
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-red-500 text-red-500 hover:bg-red-50"
                onClick={() => handleSessionAction('canceled')}
                disabled={loading}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel Session
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-orange-500 text-orange-500 hover:bg-orange-50"
                onClick={() => handleSessionAction('rescheduled')}
                disabled={loading}
              >
                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                Reschedule
              </Button>
            </>
          )}
          
          {(session.status === 'completed' || session.status === 'canceled' || session.status === 'cancelled') && (
            <Button 
              variant="outline" 
              size="sm" 
              className="border-purple-500 text-purple-500 hover:bg-purple-50"
              onClick={() => handleSessionAction('scheduled')}
              disabled={loading}
            >
              <RefreshCcw className="h-3.5 w-3.5 mr-1" />
              Change Status
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IndividualSessionCard;

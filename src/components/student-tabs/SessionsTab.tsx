
import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle, X, AlertTriangle, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Student } from "@/components/StudentCard";
import { Badge } from "@/components/ui/badge";

interface SessionsTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
}

interface Session {
  id: string;
  date: Date;
  time: string;
  duration: string;
  status: "scheduled" | "completed" | "canceled" | "missed";
  paymentStatus: "paid" | "unpaid";
  cost: number;
  notes?: string;
}

// Sample sessions for demonstration
const sampleSessions: Session[] = [
  {
    id: "1",
    date: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    time: "15:00",
    duration: "1 hour",
    status: "scheduled",
    paymentStatus: "paid",
    cost: 50,
    notes: "Algebra review session"
  },
  {
    id: "2",
    date: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    time: "16:00",
    duration: "1 hour",
    status: "completed",
    paymentStatus: "paid",
    cost: 50,
    notes: "Worked on trigonometry"
  },
  {
    id: "3",
    date: new Date(new Date().getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    time: "15:00",
    duration: "1 hour",
    status: "completed",
    paymentStatus: "paid",
    cost: 50
  },
  {
    id: "4",
    date: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    time: "14:00",
    duration: "1 hour",
    status: "scheduled",
    paymentStatus: "unpaid",
    cost: 50,
    notes: "Will cover calculus fundamentals"
  },
  {
    id: "5",
    date: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    time: "17:00",
    duration: "1 hour",
    status: "canceled",
    paymentStatus: "unpaid",
    cost: 0,
    notes: "Student was sick"
  }
];

const SessionsTab: React.FC<SessionsTabProps> = ({ studentData, setStudentData }) => {
  const [sessions] = useState<Session[]>(sampleSessions);
  
  // Filter sessions to upcoming and past
  const upcomingSessions = sessions.filter(
    session => session.status === "scheduled" && new Date(session.date) >= new Date()
  ).sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const pastSessions = sessions.filter(
    session => session.status !== "scheduled" || new Date(session.date) < new Date()
  ).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort from most recent to oldest
  
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
                      {format(session.date, "EEEE, MMMM d, yyyy")}
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
          Session management is connected to subscriptions. Add subscriptions in the Subscriptions tab to automatically generate sessions.
        </p>
      </div>
    </div>
  );
};

export default SessionsTab;

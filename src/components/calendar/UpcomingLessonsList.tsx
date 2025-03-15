
import React from 'react';
import { 
  format, 
  isSameDay, 
  isPast, 
  isFuture, 
  isToday, 
  addDays 
} from 'date-fns';
import { Session, usePayments } from '@/contexts/PaymentContext';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  CalendarX,
  XCircle,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';

interface UpcomingLessonsListProps {
  searchQuery?: string;
  onLessonClick?: (session: Session) => void;
}

const UpcomingLessonsList: React.FC<UpcomingLessonsListProps> = ({ searchQuery = '', onLessonClick }) => {
  const { sessions } = usePayments();

  // Filter sessions based on search query
  const filteredSessions = sessions
    .filter(session => {
      if (!searchQuery) return true;
      return session.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    });

  // Group sessions by date
  const today = new Date();
  const tomorrow = addDays(today, 1);
  
  const upcomingSessions = filteredSessions
    .filter(session => !isPast(new Date(session.date)) || isToday(new Date(session.date)))
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
  const pastSessions = filteredSessions
    .filter(session => isPast(new Date(session.date)) && !isToday(new Date(session.date)))
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
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

  // Handle click on a lesson
  const handleLessonClick = (session: Session) => {
    if (onLessonClick) {
      onLessonClick(session);
    }
  };

  // Render sessions for a specific date group
  const renderSessionGroup = (title: string, sessions: Session[]) => {
    if (sessions.length === 0) return null;
    
    return (
      <div className="space-y-3 mb-6">
        <h3 className="text-lg font-medium">{title}</h3>
        <div className="grid gap-3">
          {sessions.map(session => {
            const sessionDate = new Date(session.date);
            const dateLabel = isToday(sessionDate) 
              ? 'Today' 
              : isSameDay(sessionDate, tomorrow) 
                ? 'Tomorrow' 
                : format(sessionDate, 'EEEE, MMMM d');
            
            // Parse subject from notes
            const noteParts = session.notes?.split(' ') || [];
            const subject = noteParts.length > 0 ? noteParts[0] : 'Untitled';
            
            return (
              <div 
                key={session.id} 
                className="border rounded-md p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleLessonClick(session)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{subject} Lesson</div>
                    <div className="text-sm text-muted-foreground">{session.notes}</div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={
                      session.status === "completed" ? "bg-green-50 text-green-700 border-green-300" :
                      session.status === "canceled" ? "bg-orange-50 text-orange-700 border-orange-300" :
                      session.status === "missed" ? "bg-red-50 text-red-700 border-red-300" :
                      "bg-blue-50 text-blue-700 border-blue-300"
                    }
                  >
                    <span className="mr-1">{renderStatusIcon(session.status)}</span>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </Badge>
                </div>
                
                <div className="flex mt-2 items-center text-sm text-muted-foreground gap-4">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                    {dateLabel}
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1 h-3.5 w-3.5" />
                    {session.time} ({session.duration})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Render upcoming sessions */}
      {renderSessionGroup("Upcoming Lessons", upcomingSessions)}
      
      {/* Render past sessions if any */}
      {renderSessionGroup("Past Lessons", pastSessions)}
      
      {/* Empty state */}
      {upcomingSessions.length === 0 && pastSessions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No lessons found</CardTitle>
            <CardDescription>
              There are no lessons matching your search criteria.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default UpcomingLessonsList;

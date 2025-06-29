
import React, { useMemo } from 'react';
import { format, isSameDay, isSameHour, isSameMinute } from 'date-fns';
import { Session } from '@/contexts/PaymentContext';
import GroupSessionCard from './GroupSessionCard';
import IndividualSessionCard from './IndividualSessionCard';
import FunEmptyState from './FunEmptyState';

interface EnhancedUpcomingLessonsListProps {
  sessions: Session[];
  onSessionUpdate: () => void;
  onOptimisticUpdate: (sessionId: string, newStatus: Session['status']) => void;
  onRevertUpdate: (sessionId: string, originalStatus: Session['status']) => void;
  viewMode?: 'day' | 'week' | 'month';
  currentDate?: Date;
  currentWeekStart?: Date;
  subscriptionInfoMap?: Map<string, any>;
  studentInfoMap?: Map<string, any>;
}

const EnhancedUpcomingLessonsList: React.FC<EnhancedUpcomingLessonsListProps> = ({
  sessions,
  onSessionUpdate,
  onOptimisticUpdate,
  onRevertUpdate,
  viewMode = 'week',
  currentDate,
  currentWeekStart,
  subscriptionInfoMap,
  studentInfoMap
}) => {

  const processedSessions = useMemo(() => {
    // Group sessions by date, time, and whether they're group sessions
    const groupedSessions = new Map<string, Session[]>();
    
    sessions.forEach(session => {
      const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
      const dateKey = format(sessionDate, 'yyyy-MM-dd');
      const timeKey = session.time;
      
      // Create a unique key for potential group sessions
      // Sessions are considered part of the same group if they happen at the same date and time
      const groupKey = `${dateKey}-${timeKey}`;
      
      if (!groupedSessions.has(groupKey)) {
        groupedSessions.set(groupKey, []);
      }
      groupedSessions.get(groupKey)!.push(session);
    });

    const processedItems: Array<{
      type: 'individual' | 'group';
      id: string;
      session?: Session;
      groupSession?: {
        id: string;
        date: Date;
        time: string;
        duration: string;
        groupName?: string;
        sessions: Session[];
      };
    }> = [];

    // Process each group
    groupedSessions.forEach((sessionGroup, groupKey) => {
      if (sessionGroup.length === 1) {
        // Individual session
        processedItems.push({
          type: 'individual',
          id: sessionGroup[0].id,
          session: sessionGroup[0]
        });
      } else {
        // Group session (multiple students at same time)
        const firstSession = sessionGroup[0];
        const sessionDate = firstSession.date instanceof Date ? firstSession.date : new Date(firstSession.date);
        
        processedItems.push({
          type: 'group',
          id: groupKey,
          groupSession: {
            id: groupKey,
            date: sessionDate,
            time: firstSession.time,
            duration: firstSession.duration,
            groupName: `Group Session (${sessionGroup.length} students)`,
            sessions: sessionGroup
          }
        });
      }
    });

    // Sort by date and time
    processedItems.sort((a, b) => {
      const dateA = a.session?.date || a.groupSession?.date;
      const dateB = b.session?.date || b.groupSession?.date;
      const timeA = a.session?.time || a.groupSession?.time;
      const timeB = b.session?.time || b.groupSession?.time;
      
      if (!dateA || !dateB) return 0;
      
      const dateAObj = dateA instanceof Date ? dateA : new Date(dateA);
      const dateBObj = dateB instanceof Date ? dateB : new Date(dateB);
      
      if (dateAObj.getTime() !== dateBObj.getTime()) {
        return dateAObj.getTime() - dateBObj.getTime();
      }
      
      // If dates are same, sort by time
      const [hoursA, minutesA] = (timeA || '').split(':').map(Number);
      const [hoursB, minutesB] = (timeB || '').split(':').map(Number);
      
      return (hoursA * 60 + minutesA) - (hoursB * 60 + minutesB);
    });

    return processedItems;
  }, [sessions]);

  const handleSessionAction = async (sessionId: string, action: string) => {
    // Find the original session
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const originalStatus = session.status;
    
    // Optimistic update
    let newStatus: Session['status'];
    switch (action) {
      case 'completed':
        newStatus = 'completed';
        break;
      case 'canceled':
        newStatus = 'canceled';
        break;
      case 'scheduled':
        newStatus = 'scheduled';
        break;
      case 'rescheduled':
        newStatus = 'scheduled'; // For now, just mark as scheduled
        break;
      default:
        return;
    }

    onOptimisticUpdate(sessionId, newStatus);

    try {
      // Here you would make the actual API call
      // For now, we'll just refresh the sessions
      await onSessionUpdate();
    } catch (error) {
      // Revert on error
      onRevertUpdate(sessionId, originalStatus);
      console.error('Failed to update session:', error);
    }
  };

  if (processedSessions.length === 0) {
    return <FunEmptyState viewMode={viewMode} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {viewMode === 'day' && 'Today\'s Sessions'}
          {viewMode === 'week' && 'This Week\'s Sessions'}
          {viewMode === 'month' && 'This Month\'s Sessions'}
        </h3>
        <div className="text-sm text-muted-foreground">
          {processedSessions.length} session{processedSessions.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="space-y-4">
        {processedSessions.map((item) => (
          <div key={item.id}>
            {item.type === 'individual' && item.session && (
              <IndividualSessionCard
                session={item.session}
                onSessionAction={handleSessionAction}
              />
            )}
            {item.type === 'group' && item.groupSession && (
              <GroupSessionCard
                groupSession={item.groupSession}
                onSessionAction={handleSessionAction}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnhancedUpcomingLessonsList;

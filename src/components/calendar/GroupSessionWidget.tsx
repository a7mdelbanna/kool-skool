
import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  ChevronDown, 
  ChevronRight,
  Users,
  Calendar as CalendarIcon,
  Clock
} from 'lucide-react';
import { Session } from '@/contexts/PaymentContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface GroupSessionWidgetProps {
  groupSessions: Session[];
  onLessonClick?: (session: Session) => void;
  onSessionUpdate?: () => void;
  onOptimisticUpdate?: (sessionId: string, newStatus: Session['status']) => void;
  onRevertUpdate?: (sessionId: string, originalStatus: Session['status']) => void;
  subscriptionInfoMap: Map<string, any>;
  studentInfoMap: Map<string, any>;
  renderSessionCard: (session: Session) => React.ReactNode;
}

const GroupSessionWidget: React.FC<GroupSessionWidgetProps> = ({
  groupSessions,
  onLessonClick,
  onSessionUpdate,
  onOptimisticUpdate,
  onRevertUpdate,
  subscriptionInfoMap,
  studentInfoMap,
  renderSessionCard
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!groupSessions || groupSessions.length === 0) {
    return null;
  }

  // Use the first session to get group info (they should all have the same group details)
  const firstSession = groupSessions[0];
  const sessionDate = new Date(firstSession.date);
  
  // Extract group name from session notes or use a default
  const groupName = firstSession.notes?.includes('Group:') 
    ? firstSession.notes.split('Group:')[1]?.split(' ')[0]?.trim() 
    : 'Group Session';

  // Count different statuses
  const statusCounts = groupSessions.reduce((acc, session) => {
    acc[session.status] = (acc[session.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalStudents = groupSessions.length;
  const completedCount = statusCounts.completed || 0;
  const scheduledCount = statusCounts.scheduled || 0;
  const canceledCount = (statusCounts.canceled || 0) + (statusCounts.cancelled || 0);
  const missedCount = statusCounts.missed || 0;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between cursor-pointer hover:bg-blue-100/50 rounded-lg p-2 transition-colors">
                <div className="flex items-start gap-4 flex-1">
                  {/* Group Icon & Time */}
                  <div className="flex-shrink-0 text-center min-w-[80px]">
                    <div className="bg-blue-500 text-white rounded-full p-3 mb-2 mx-auto w-12 h-12 flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {firstSession.time.split(':')[0]}
                    </div>
                    <div className="text-sm text-blue-600">
                      :{firstSession.time.split(':')[1]}
                    </div>
                    <div className="text-xs text-blue-500 mt-1">
                      {firstSession.duration}
                    </div>
                  </div>

                  {/* Group Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-blue-900">{groupName}</h3>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        <Users className="h-3 w-3 mr-1" />
                        {totalStudents} students
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-sm text-blue-700 mb-3">
                      <CalendarIcon className="mr-1.5 h-4 w-4" />
                      {format(sessionDate, 'EEEE, MMMM d, yyyy')}
                    </div>

                    {/* Status Summary */}
                    <div className="flex flex-wrap gap-2">
                      {completedCount > 0 && (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          {completedCount} completed
                        </Badge>
                      )}
                      {scheduledCount > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                          {scheduledCount} scheduled
                        </Badge>
                      )}
                      {canceledCount > 0 && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                          {canceledCount} canceled
                        </Badge>
                      )}
                      {missedCount > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-red-300">
                          {missedCount} missed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse Button */}
                  <div className="flex-shrink-0">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-100">
                      {isExpanded ? (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-4 w-4 mr-1" />
                          Show Details
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="border-t border-blue-200 pt-4">
              <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Individual Student Sessions
              </h4>
              <div className="space-y-3 pl-4">
                {groupSessions.map((session) => (
                  <div key={session.id} className="border-l-2 border-blue-300 pl-4">
                    {renderSessionCard(session)}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default GroupSessionWidget;

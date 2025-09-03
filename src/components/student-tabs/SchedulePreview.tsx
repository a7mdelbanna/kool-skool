
import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfWeek } from 'date-fns';

interface ScheduleItem {
  day: string;
  time: string;
}

interface SchedulePreviewProps {
  schedule: ScheduleItem[];
  startDate?: Date;
  sessionCount: number;
  durationMonths: number;
  sessionDuration?: string;
}

const SchedulePreview: React.FC<SchedulePreviewProps> = ({
  schedule,
  startDate,
  sessionCount,
  durationMonths,
  sessionDuration = '60'
}) => {
  const formatTime = (time: string) => {
    if (!time) return '';
    
    // If time already has AM/PM, return as is
    if (time.includes('AM') || time.includes('PM')) {
      return time;
    }
    
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getDayOfWeekNumber = (dayName: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.indexOf(dayName);
  };

  const getNextSessionDates = () => {
    if (!startDate || schedule.length === 0) return [];
    
    const dates = [];
    const currentWeekStart = startOfWeek(startDate);
    
    // Generate next 4 session dates
    for (let week = 0; week < 4 && dates.length < Math.min(sessionCount, 4); week++) {
      schedule.forEach(scheduleItem => {
        if (dates.length >= Math.min(sessionCount, 4)) return;
        
        const dayOfWeek = getDayOfWeekNumber(scheduleItem.day);
        if (dayOfWeek !== -1) {
          const sessionDate = addDays(currentWeekStart, dayOfWeek + (week * 7));
          if (sessionDate >= startDate) {
            dates.push({
              date: sessionDate,
              time: scheduleItem.time,
              day: scheduleItem.day
            });
          }
        }
      });
    }
    
    return dates.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const nextSessions = getNextSessionDates();

  if (schedule.length === 0) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-600 text-sm">Add schedule items to see preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-blue-600" />
          Schedule Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Schedule Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Total Sessions</p>
            <p className="font-semibold text-gray-900">{sessionCount} sessions</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Duration</p>
            <p className="font-semibold text-gray-900">{durationMonths} month{durationMonths !== 1 ? 's' : ''}</p>
          </div>
        </div>
        
        {/* Session Duration */}
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-gray-600 mb-1">Session Duration</p>
          <p className="font-semibold text-gray-900">{sessionDuration} minutes</p>
        </div>

        {/* Weekly Schedule */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">Weekly Schedule</p>
          <div className="space-y-2">
            {schedule.map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="font-medium text-gray-900">{item.day}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{formatTime(item.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Sessions Preview */}
        {nextSessions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Next Sessions</p>
            <div className="space-y-2">
              {nextSessions.map((session, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2 border text-sm">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {format(session.date, 'MMM dd')}
                    </Badge>
                    <span className="text-gray-600">{session.day}</span>
                  </div>
                  <span className="text-gray-600">{formatTime(session.time)}</span>
                </div>
              ))}
              {sessionCount > 4 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  ...and {sessionCount - 4} more sessions
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SchedulePreview;

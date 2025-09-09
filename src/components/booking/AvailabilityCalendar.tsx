import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Ban,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { teacherAvailabilityService, AvailableSlot, AvailabilityBlock } from '@/services/firebase/teacherAvailability.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserContext } from '@/App';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  teacherId: string;
  onBlockTime?: () => void;
}

interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasAvailability: boolean;
  hasSessions: boolean;
  hasBlocks: boolean;
  slots: AvailableSlot[];
  sessions: any[];
  blocks: AvailabilityBlock[];
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AvailabilityCalendar: React.FC<Props> = ({ teacherId, onBlockTime }) => {
  const { user } = useContext(UserContext);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthData, setMonthData] = useState<DayData[]>([]);
  const [selectedDayDetails, setSelectedDayDetails] = useState<DayData | null>(null);

  useEffect(() => {
    loadMonthData();
  }, [teacherId, currentMonth]);

  useEffect(() => {
    if (selectedDate) {
      const dayData = monthData.find(d => 
        format(d.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      );
      setSelectedDayDetails(dayData || null);
    }
  }, [selectedDate, monthData]);

  const loadMonthData = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start, end });
      
      // Get teacher availability settings
      const availability = await teacherAvailabilityService.getTeacherAvailability(teacherId);
      
      // Get available slots for the month
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      const slots = await teacherAvailabilityService.getAvailableSlots(
        teacherId,
        startStr,
        endStr,
        60, // Default 60 minute duration
        user?.timezone
      );
      
      // Get blocks for the month
      const blocks = await teacherAvailabilityService.getTeacherBlocks(teacherId, startStr, endStr);
      
      // Get existing sessions for the month
      const sessions = await loadTeacherSessions(teacherId, startStr, endStr);
      
      // Process data for each day
      const processedDays: DayData[] = days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = getDay(date);
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
        
        const daySlots = slots.filter(s => s.date === dateStr);
        const dayBlocks = blocks.filter(b => b.date === dateStr);
        const daySessions = sessions.filter(s => s.date === dateStr);
        
        const hasWorkingHours = availability?.working_hours?.[dayName as keyof typeof availability.working_hours]?.enabled || false;
        
        return {
          date,
          isCurrentMonth: isSameMonth(date, currentMonth),
          isToday: isToday(date),
          hasAvailability: hasWorkingHours && daySlots.some(s => s.isAvailable),
          hasSessions: daySessions.length > 0,
          hasBlocks: dayBlocks.length > 0,
          slots: daySlots,
          sessions: daySessions,
          blocks: dayBlocks
        };
      });
      
      setMonthData(processedDays);
    } catch (error) {
      console.error('Error loading month data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherSessions = async (teacherId: string, startDate: string, endDate: string) => {
    try {
      const sessions: any[] = [];
      
      // First, get all students taught by this teacher
      const studentsQuery = query(
        collection(db, 'students'),
        where('teacher_id', '==', teacherId)
      );
      
      const studentSnapshot = await getDocs(studentsQuery);
      const studentIds = studentSnapshot.docs.map(doc => doc.id);
      
      // Query sessions for these students
      if (studentIds.length > 0) {
        const batchSize = 10;
        
        for (let i = 0; i < studentIds.length; i += batchSize) {
          const batch = studentIds.slice(i, i + batchSize);
          
          const sessionQuery = query(
            collection(db, 'lesson_sessions'),
            where('student_id', 'in', batch),
            where('status', '==', 'scheduled')
          );
          
          const sessionSnapshot = await getDocs(sessionQuery);
          
          sessionSnapshot.forEach((doc) => {
            const session = { id: doc.id, ...doc.data() };
            // Check multiple possible date fields
            const sessionDate = session.scheduled_date || session.scheduledDate || session.scheduledDateTime;
            
            if (sessionDate) {
              const dateStr = sessionDate.split('T')[0];
              if (dateStr >= startDate && dateStr <= endDate) {
                let timeStr = 'Time TBD';
                if (sessionDate.includes('T')) {
                  timeStr = sessionDate.split('T')[1]?.substring(0, 5) || 'Time TBD';
                } else if (session.scheduledTime) {
                  timeStr = session.scheduledTime;
                }
                
                sessions.push({
                  ...session,
                  date: dateStr,
                  scheduled_time: timeStr
                });
              }
            }
          });
        }
      }
      
      // Also check for sessions where the teacher is directly assigned (for admins who teach)
      const directSessionsQuery = query(
        collection(db, 'lesson_sessions'),
        where('teacher_id', '==', teacherId),
        where('status', '==', 'scheduled')
      );
      
      const directSnapshot = await getDocs(directSessionsQuery);
      directSnapshot.forEach((doc) => {
        const session = { id: doc.id, ...doc.data() };
        // Check multiple possible date fields
        const sessionDate = session.scheduled_date || session.scheduledDate || session.scheduledDateTime;
        
        if (sessionDate) {
          const dateStr = sessionDate.split('T')[0];
          if (dateStr >= startDate && dateStr <= endDate) {
            // Avoid duplicates
            if (!sessions.find(s => s.id === session.id)) {
              let timeStr = 'Time TBD';
              if (sessionDate.includes('T')) {
                timeStr = sessionDate.split('T')[1]?.substring(0, 5) || 'Time TBD';
              } else if (session.scheduledTime) {
                timeStr = session.scheduledTime;
              }
              
              sessions.push({
                ...session,
                date: dateStr,
                scheduled_time: timeStr
              });
            }
          }
        }
      });
      
      return sessions;
    } catch (error) {
      console.error('Error loading teacher sessions:', error);
      return [];
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  const getDayColor = (day: DayData) => {
    if (!day.isCurrentMonth) return 'bg-gray-50';
    if (day.hasBlocks) return 'bg-red-50 hover:bg-red-100';
    if (day.hasSessions && !day.hasAvailability) return 'bg-orange-50 hover:bg-orange-100';
    if (day.hasAvailability) return 'bg-green-50 hover:bg-green-100';
    if (day.hasAvailability === false) return 'bg-gray-100';
    return 'hover:bg-gray-50';
  };

  const getDayBadges = (day: DayData) => {
    const badges = [];
    
    if (day.hasBlocks) {
      badges.push(
        <Badge key="blocked" variant="destructive" className="text-xs">
          <Ban className="h-3 w-3" />
        </Badge>
      );
    }
    
    if (day.hasSessions) {
      badges.push(
        <Badge key="sessions" variant="secondary" className="text-xs">
          {day.sessions.length}
        </Badge>
      );
    }
    
    if (day.hasAvailability && !day.hasBlocks) {
      const availableCount = day.slots.filter(s => s.isAvailable).length;
      if (availableCount > 0) {
        badges.push(
          <Badge key="available" variant="outline" className="text-xs border-green-500 text-green-600">
            {availableCount}
          </Badge>
        );
      }
    }
    
    return badges;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Calendar View */}
      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Availability Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[150px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="text-center font-medium text-sm text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {monthData.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day.date)}
                    className={cn(
                      "relative p-3 rounded-lg border transition-colors min-h-[80px]",
                      getDayColor(day),
                      day.isToday && "ring-2 ring-primary",
                      selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd') && "ring-2 ring-blue-500"
                    )}
                    disabled={!day.isCurrentMonth}
                  >
                    <div className="flex flex-col h-full">
                      <span className={cn(
                        "text-sm font-medium",
                        !day.isCurrentMonth && "text-muted-foreground"
                      )}>
                        {format(day.date, 'd')}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {getDayBadges(day)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded" />
                  <span className="text-sm text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-100 rounded" />
                  <span className="text-sm text-muted-foreground">Has Sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 rounded" />
                  <span className="text-sm text-muted-foreground">Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                  <span className="text-sm text-muted-foreground">Not Working</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Details */}
      <Card className="flex flex-col h-full">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <span>Day Details</span>
            {selectedDate && onBlockTime && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBlockTime}
              >
                <Plus className="h-4 w-4 mr-1" />
                Block Time
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          {selectedDayDetails ? (
            <div className="flex flex-col h-full">
              <div className="flex-shrink-0 pb-3">
                <p className="font-medium text-lg">
                  {format(selectedDayDetails.date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>

              {/* Available Slots */}
              {selectedDayDetails.slots.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="font-medium mb-2 flex items-center gap-2 flex-shrink-0">
                    <Clock className="h-4 w-4" />
                    Time Slots
                  </h4>
                  <div className="space-y-1 overflow-y-auto flex-1 pr-2">
                    {selectedDayDetails.slots.map((slot, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-sm",
                          slot.isAvailable ? "bg-green-50" : "bg-gray-50"
                        )}
                      >
                        <span>{slot.start} - {slot.end}</span>
                        {slot.isAvailable ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Sessions */}
              {selectedDayDetails.sessions.length > 0 && (
                <div className="flex-shrink-0 pt-3 border-t">
                  <h4 className="font-medium mb-2">Scheduled Sessions</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedDayDetails.sessions.map((session) => (
                      <div key={session.id} className="p-2 bg-orange-50 rounded text-sm">
                        <p className="font-medium">{session.scheduled_time || 'Time TBD'}</p>
                        <p className="text-muted-foreground">Duration: {session.duration_minutes || 60} min</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocks */}
              {selectedDayDetails.blocks.length > 0 && (
                <div className="flex-shrink-0 pt-3 border-t">
                  <h4 className="font-medium mb-2">Blocked Times</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedDayDetails.blocks.map((block) => (
                      <div key={block.id} className="p-2 bg-red-50 rounded text-sm">
                        <p className="font-medium">{block.start_time} - {block.end_time}</p>
                        {block.reason && (
                          <p className="text-muted-foreground">{block.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedDayDetails.slots.length && !selectedDayDetails.sessions.length && !selectedDayDetails.blocks.length && (
                <p className="text-muted-foreground text-sm flex-shrink-0">
                  No availability configured for this day
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Select a day to view details
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityCalendar;
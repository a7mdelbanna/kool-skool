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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { teacherAvailabilityService, AvailableSlot, AvailabilityBlock } from '@/services/firebase/teacherAvailability.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserContext } from '@/App';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';

interface Props {
  teacherId: string;
  onBlockTime?: () => void;
}

interface SessionWithDetails {
  id: string;
  subscription_id: string;
  student_id: string;
  status: string;
  duration_minutes: number;
  date: string;
  scheduled_time: string;
  studentName?: string;
  subject?: string;
}

interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasAvailability: boolean;
  hasSessions: boolean;
  hasBlocks: boolean;
  slots: AvailableSlot[];
  sessions: SessionWithDetails[];
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

      // Get the first and last day of the current month
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Get the start of the week containing the first day of the month
      // and the end of the week containing the last day of the month
      // This ensures we fill the entire calendar grid with padding days
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 0 = Sunday
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

      // Get all days to display in the calendar grid (including padding days)
      const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      
      // Get teacher availability settings
      const availability = await teacherAvailabilityService.getTeacherAvailability(teacherId);

      // Get available slots for the full calendar range (including padding days)
      const startStr = format(calendarStart, 'yyyy-MM-dd');
      const endStr = format(calendarEnd, 'yyyy-MM-dd');
      const slots = await teacherAvailabilityService.getAvailableSlots(
        teacherId,
        startStr,
        endStr,
        60, // Default 60 minute duration
        user?.timezone
      );

      // Get blocks for the full calendar range
      const blocks = await teacherAvailabilityService.getTeacherBlocks(teacherId, startStr, endStr);

      // Get existing sessions for the full calendar range
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
      console.log('🔍 AVAILABILITY CALENDAR: Loading sessions for teacher:', teacherId, 'between', startDate, 'and', endDate);
      const sessions: any[] = [];

      // Step 1: Get all subscriptions for this teacher from Firebase
      console.log('🔥 Step 1: Querying Firebase subscriptions with teacherId:', teacherId);
      const subscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('teacherId', '==', teacherId)
      );

      const subscriptionSnapshot = await getDocs(subscriptionsQuery);

      console.log(`📊 Found ${subscriptionSnapshot.docs.length} total subscriptions for teacher`);

      // Create a map of subscription details and filter for active subscriptions only
      const subscriptionDetails: Record<string, any> = {};
      const subscriptionIds: string[] = [];

      subscriptionSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const subDetails = {
          teacherId: data.teacherId,
          studentId: data.studentId || data.student_id,
          startDate: data.startDate || data.start_date,
          status: data.status,
          subject: data.subject
        };

        console.log(`📦 Subscription ${doc.id}:`, {
          ...subDetails,
          id: doc.id
        });

        // Only include active subscriptions to avoid showing old sessions
        if (data.status === 'active') {
          subscriptionDetails[doc.id] = subDetails;
          subscriptionIds.push(doc.id);
          console.log(`  ✅ Including subscription (active) - Student: ${subDetails.studentId}, Subject: ${subDetails.subject}`);
        } else {
          console.log(`  ⏭️ Skipping subscription (status: ${data.status})`);
        }
      });

      console.log(`✅ Found ${subscriptionIds.length} subscriptions for teacher:`, subscriptionIds);

      if (subscriptionIds.length === 0) {
        console.log('ℹ️ No subscriptions found for this teacher');
        return [];
      }

      // Step 2: Get all sessions for these subscriptions from Firebase
      console.log('🔥 Step 2: Querying Firebase sessions for these subscriptions');

      // Firebase has a limit of 10 items in 'in' queries, so batch them
      const batchSize = 10;
      let allSessionDocs: any[] = [];

      for (let i = 0; i < subscriptionIds.length; i += batchSize) {
        const batch = subscriptionIds.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}:`, batch);

        // Try 'sessions' collection first
        try {
          const sessionsQuery = query(
            collection(db, 'sessions'),
            where('subscriptionId', 'in', batch)
          );
          const snapshot = await getDocs(sessionsQuery);
          allSessionDocs.push(...snapshot.docs);
          console.log(`✅ Found ${snapshot.docs.length} sessions in 'sessions' collection for batch`);
        } catch (error) {
          console.log('⚠️ Error querying sessions collection:', error);
        }

        // Also try with snake_case field name
        try {
          const sessionsQuery = query(
            collection(db, 'sessions'),
            where('subscription_id', 'in', batch)
          );
          const snapshot = await getDocs(sessionsQuery);
          // Filter out duplicates
          const newDocs = snapshot.docs.filter(doc =>
            !allSessionDocs.some(existing => existing.id === doc.id)
          );
          allSessionDocs.push(...newDocs);
          console.log(`✅ Found ${newDocs.length} additional sessions with subscription_id field`);
        } catch (error) {
          console.log('⚠️ Error querying sessions with subscription_id:', error);
        }
      }

      console.log(`📊 Total session documents found: ${allSessionDocs.length}`);

      // Step 3: Process each session
      allSessionDocs.forEach((doc) => {
        const session = { id: doc.id, ...doc.data() };
        console.log('📝 Processing session:', session.id, 'Status:', session.status);

        // SHOW ALL SESSIONS - NO STATUS FILTERING
        // Get the session date - check multiple possible field names
        let sessionDate = session.scheduledDateTime || session.scheduledDate || session.scheduled_date || session.scheduled_datetime;

        // Handle Firestore Timestamp objects
        if (sessionDate && typeof sessionDate.toDate === 'function') {
          sessionDate = sessionDate.toDate();
        }

        if (sessionDate) {
          // Handle different date formats
          let dateStr: string;
          if (typeof sessionDate === 'string') {
            dateStr = sessionDate.split('T')[0];
          } else if (sessionDate instanceof Date) {
            dateStr = format(sessionDate, 'yyyy-MM-dd');
          } else {
            console.log('⚠️ Unknown date format:', sessionDate);
            return;
          }

          console.log('📆 Session date:', dateStr, 'Range:', startDate, '-', endDate);

          // Filter by date range
          if (dateStr >= startDate && dateStr <= endDate) {
            // Get time
            let timeStr = session.scheduled_time || session.scheduledTime || 'Time TBD';
            if (!timeStr || timeStr === 'Time TBD') {
              if (typeof sessionDate === 'string' && sessionDate.includes('T')) {
                timeStr = sessionDate.split('T')[1]?.substring(0, 5) || 'Time TBD';
              } else if (sessionDate instanceof Date) {
                timeStr = format(sessionDate, 'HH:mm');
              }
            }

            const sessionData = {
              id: session.id,
              subscription_id: session.subscription_id || session.subscriptionId,
              student_id: session.student_id || session.studentId,
              status: session.status,
              duration_minutes: session.duration_minutes || session.durationMinutes || 60,
              date: dateStr,
              scheduled_time: timeStr
            };

            // Log which subscription this session belongs to
            const subId = sessionData.subscription_id;
            const subDetails = subscriptionDetails[subId];

            // Detailed logging for November sessions
            const isNovember = dateStr.startsWith('2025-11');
            if (isNovember) {
              console.log('🎯 NOVEMBER SESSION FOUND:', {
                sessionId: session.id,
                date: dateStr,
                time: timeStr,
                status: session.status,
                subscriptionId: subId,
                subscriptionTeacher: subDetails?.teacherId,
                subscriptionStudent: subDetails?.studentId,
                subscriptionSubject: subDetails?.subject
              });
            }

            console.log(`✅ Adding session to calendar - ${dateStr} ${timeStr} Status: ${session.status} (${subDetails?.subject || 'Unknown'})`);
            sessions.push(sessionData);
          } else {
            console.log('⏭️ Session outside date range');
          }
        } else {
          console.log('⚠️ Session missing date field:', session.id);
        }
      });

      console.log('✅ Total sessions loaded for calendar:', sessions.length);

      // Step 4: Enrich sessions with student names and subjects
      console.log('🔥 Step 4: Enriching sessions with student and subscription details');
      const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
          try {
            // Fetch student name
            let studentName = 'Unknown Student';
            if (session.student_id) {
              try {
                const studentDoc = await databaseService.getById('students', session.student_id);
                if (studentDoc) {
                  const firstName = studentDoc.firstName || studentDoc.first_name || '';
                  const lastName = studentDoc.lastName || studentDoc.last_name || '';
                  studentName = `${firstName} ${lastName}`.trim() || studentDoc.name || 'Unknown Student';
                }
              } catch (error) {
                console.log('⚠️ Error fetching student:', error);
              }
            }

            // Fetch subject from subscription
            let subject = 'General';
            if (session.subscription_id) {
              try {
                const subscriptionDoc = await databaseService.getById('subscriptions', session.subscription_id);
                if (subscriptionDoc) {
                  subject = subscriptionDoc.subject || subscriptionDoc.course || 'General';
                }
              } catch (error) {
                console.log('⚠️ Error fetching subscription:', error);
              }
            }

            return {
              ...session,
              studentName,
              subject
            };
          } catch (error) {
            console.log('⚠️ Error enriching session:', error);
            return {
              ...session,
              studentName: 'Unknown Student',
              subject: 'General'
            };
          }
        })
      );

      console.log('✅ Sessions enriched with details');
      return enrichedSessions;
    } catch (error) {
      console.error('❌ Error loading teacher sessions:', error);
      return [];
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  const getDayColor = (day: DayData) => {
    // Base colors with dark mode support
    if (!day.isCurrentMonth) {
      return 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800';
    }

    if (day.hasBlocks) {
      return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900/50';
    }

    if (day.hasSessions) {
      return 'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50 border-orange-200 dark:border-orange-900/50';
    }

    if (day.hasAvailability) {
      return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 border-green-200 dark:border-green-900/50';
    }

    // No working hours configured
    return 'bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-800';
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
      <Card className="lg:col-span-2 h-fit bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
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
              <span className="font-medium min-w-[150px] text-center text-foreground">
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
                  <div key={day} className="text-center font-medium text-sm text-foreground/70 py-2">
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
                      "relative p-2 rounded-lg border transition-all min-h-[90px]",
                      "flex flex-col items-start",
                      getDayColor(day),
                      day.isToday && "ring-2 ring-primary ring-offset-2",
                      selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd') && "ring-2 ring-blue-500 ring-offset-2",
                      !day.isCurrentMonth && "opacity-50"
                    )}
                    disabled={!day.isCurrentMonth}
                  >
                    {/* Day Number - Prominent in top-left */}
                    <div className="w-full flex justify-between items-start mb-1">
                      <span className={cn(
                        "text-lg font-bold leading-none",
                        day.isCurrentMonth ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-600"
                      )}>
                        {format(day.date, 'd')}
                      </span>
                      {day.isToday && (
                        <span className="text-[10px] font-semibold text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Status Indicators - Bottom area */}
                    <div className="w-full flex-1 flex flex-col justify-end gap-1">
                      {/* Sessions indicator */}
                      {day.hasSessions && (
                        <div className="flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-400">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span>{day.sessions.length} session{day.sessions.length > 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {/* Blocked indicator */}
                      {day.hasBlocks && (
                        <div className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                          <Ban className="w-3 h-3" />
                          <span>Blocked</span>
                        </div>
                      )}

                      {/* Available slots indicator */}
                      {day.hasAvailability && !day.hasBlocks && (
                        <div className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          <span>{day.slots.filter(s => s.isAvailable).length} slots</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-foreground">Available Slots</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm font-medium text-foreground">Scheduled Sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-foreground">Blocked Time</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded border border-gray-400 dark:border-gray-600" />
                  <span className="text-sm font-medium text-foreground">No Working Hours</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Details */}
      <Card className="flex flex-col h-full bg-card">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between text-foreground">
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
                <p className="font-medium text-lg text-foreground">
                  {format(selectedDayDetails.date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>

              {/* Available Slots */}
              {selectedDayDetails.slots.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="font-medium mb-2 flex items-center gap-2 flex-shrink-0 text-foreground">
                    <Clock className="h-4 w-4" />
                    Time Slots
                  </h4>
                  <div className="space-y-1 overflow-y-auto flex-1 pr-2">
                    {selectedDayDetails.slots.map((slot, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-sm",
                          slot.isAvailable
                            ? "bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100"
                            : "bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                        )}
                      >
                        <span className="font-medium">{slot.start} - {slot.end}</span>
                        {slot.isAvailable ? (
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
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
                  <h4 className="font-medium mb-2 text-foreground">Scheduled Sessions</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedDayDetails.sessions.map((session) => (
                      <div key={session.id} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-orange-900 dark:text-orange-100 text-base">
                            {session.scheduled_time || 'Time TBD'}
                          </p>
                          <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                            {session.duration_minutes || 60} min
                          </span>
                        </div>
                        {session.studentName && (
                          <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-0.5">
                            {session.studentName}
                          </p>
                        )}
                        {session.subject && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Subject: {session.subject}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocks */}
              {selectedDayDetails.blocks.length > 0 && (
                <div className="flex-shrink-0 pt-3 border-t">
                  <h4 className="font-medium mb-2 text-foreground">Blocked Times</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedDayDetails.blocks.map((block) => (
                      <div key={block.id} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                        <p className="font-medium text-red-900 dark:text-red-100">{block.start_time} - {block.end_time}</p>
                        {block.reason && (
                          <p className="text-red-700 dark:text-red-300">{block.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedDayDetails.slots.length && !selectedDayDetails.sessions.length && !selectedDayDetails.blocks.length && (
                <p className="text-foreground/60 text-sm flex-shrink-0">
                  No availability configured for this day
                </p>
              )}
            </div>
          ) : (
            <p className="text-foreground/60">
              Select a day to view details
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityCalendar;
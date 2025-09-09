import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  Timestamp,
  or
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { format, parseISO, addDays, isWithinInterval, getDay, setHours, setMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface TimeSlot {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
  breaks: TimeSlot[];
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface TeacherAvailability {
  id?: string;
  teacher_id: string;
  school_id: string;
  working_hours: WeeklySchedule;
  timezone: string;
  buffer_time: number; // minutes between sessions
  min_booking_notice: number; // hours required for advance booking
  max_booking_advance: number; // days allowed for advance booking
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface AvailabilityBlock {
  id?: string;
  teacher_id: string;
  type: 'blocked' | 'available'; // blocked = not available, available = override to make available
  date: string; // YYYY-MM-DD format
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  reason?: string;
  recurring?: boolean;
  recurrence_pattern?: 'weekly' | 'monthly';
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface AvailableSlot {
  date: string;
  start: string;
  end: string;
  isAvailable: boolean;
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

class TeacherAvailabilityService {
  private readonly availabilityCollection = 'teacher_availability';
  private readonly blocksCollection = 'availability_blocks';

  /**
   * Get teacher availability settings
   */
  async getTeacherAvailability(teacherId: string): Promise<TeacherAvailability | null> {
    try {
      const docRef = doc(db, this.availabilityCollection, teacherId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as TeacherAvailability;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting teacher availability:', error);
      throw error;
    }
  }

  /**
   * Set or update teacher working hours
   */
  async setWorkingHours(teacherId: string, availability: Partial<TeacherAvailability>): Promise<void> {
    try {
      const docRef = doc(db, this.availabilityCollection, teacherId);
      const existingDoc = await getDoc(docRef);
      
      if (existingDoc.exists()) {
        await updateDoc(docRef, {
          ...availability,
          updated_at: Timestamp.now()
        });
      } else {
        await setDoc(docRef, {
          teacher_id: teacherId,
          ...availability,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error setting working hours:', error);
      throw error;
    }
  }

  /**
   * Block a time slot for a teacher
   */
  async blockTimeSlot(block: Omit<AvailabilityBlock, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const blockData = {
        ...block,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };
      
      const docRef = doc(collection(db, this.blocksCollection));
      await setDoc(docRef, blockData);
      
      return docRef.id;
    } catch (error) {
      console.error('Error blocking time slot:', error);
      throw error;
    }
  }

  /**
   * Unblock a time slot
   */
  async unblockTimeSlot(blockId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.blocksCollection, blockId));
    } catch (error) {
      console.error('Error unblocking time slot:', error);
      throw error;
    }
  }

  /**
   * Get all blocks for a teacher within a date range
   */
  async getTeacherBlocks(
    teacherId: string, 
    startDate: string, 
    endDate: string
  ): Promise<AvailabilityBlock[]> {
    try {
      // Get all blocks for the teacher first (single field query doesn't need composite index)
      const blocksQuery = query(
        collection(db, this.blocksCollection),
        where('teacher_id', '==', teacherId)
      );
      
      const snapshot = await getDocs(blocksQuery);
      
      // Filter by date range in memory
      const blocks = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as AvailabilityBlock))
        .filter(block => {
          // Only include blocks within the date range
          return block.date >= startDate && block.date <= endDate;
        });
      
      return blocks;
    } catch (error) {
      console.error('Error getting teacher blocks:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get available slots for a teacher within a date range
   */
  async getAvailableSlots(
    teacherId: string,
    startDate: string,
    endDate: string,
    duration: number, // in minutes
    timezone?: string
  ): Promise<AvailableSlot[]> {
    try {
      // Get teacher availability settings
      const availability = await this.getTeacherAvailability(teacherId);
      console.log(`Getting available slots for teacher ${teacherId}:`, availability);
      if (!availability) {
        console.log('No availability settings found for teacher');
        return [];
      }

      const teacherTimezone = timezone || availability.timezone || 'UTC';
      const slots: AvailableSlot[] = [];
      
      // Get all blocks for the date range
      const blocks = await this.getTeacherBlocks(teacherId, startDate, endDate);
      
      // Get existing sessions for the teacher
      const sessions = await this.getTeacherSessions(teacherId, startDate, endDate);
      console.log(`Found ${sessions.length} sessions for teacher ${teacherId} between ${startDate} and ${endDate}`);
      
      // Iterate through each day in the range
      let currentDate = parseISO(startDate);
      const end = parseISO(endDate);
      
      while (currentDate <= end) {
        const dayOfWeek = DAYS_OF_WEEK[getDay(currentDate)];
        const daySchedule = availability.working_hours[dayOfWeek];
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        console.log(`Checking ${dateStr} (${dayOfWeek}):`, daySchedule);
        
        if (daySchedule?.enabled) {
          // Get available slots for this day
          const daySlots = this.generateDaySlots(
            dateStr,
            daySchedule,
            duration,
            availability.buffer_time,
            blocks.filter(b => b.date === dateStr),
            sessions.filter(s => s.date === dateStr),
            teacherTimezone
          );
          
          slots.push(...daySlots);
        }
        
        currentDate = addDays(currentDate, 1);
      }
      
      return slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Check if a specific slot is available
   */
  async checkSlotAvailability(
    teacherId: string,
    date: string,
    startTime: string,
    duration: number,
    excludeSessionId?: string
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      // Get teacher availability
      const availability = await this.getTeacherAvailability(teacherId);
      if (!availability) {
        return { available: false, reason: 'Teacher availability not configured' };
      }

      // Check if it's within working hours
      const dayOfWeek = DAYS_OF_WEEK[getDay(parseISO(date))];
      const daySchedule = availability.working_hours[dayOfWeek];
      
      if (!daySchedule?.enabled) {
        return { available: false, reason: 'Teacher does not work on this day' };
      }

      // Check if time is within working hours
      if (startTime < daySchedule.start || this.addMinutesToTime(startTime, duration) > daySchedule.end) {
        return { available: false, reason: 'Outside of working hours' };
      }

      // Check if it overlaps with breaks
      for (const breakSlot of daySchedule.breaks || []) {
        if (this.timeSlotsOverlap(startTime, duration, breakSlot.start, this.getMinutesBetween(breakSlot.start, breakSlot.end))) {
          return { available: false, reason: 'Overlaps with break time' };
        }
      }

      // Check blocks
      const blocks = await this.getTeacherBlocks(teacherId, date, date);
      for (const block of blocks) {
        if (block.type === 'blocked' && 
            this.timeSlotsOverlap(startTime, duration, block.start_time, this.getMinutesBetween(block.start_time, block.end_time))) {
          return { available: false, reason: block.reason || 'Time slot is blocked' };
        }
      }

      // Check existing sessions
      const sessions = await this.getTeacherSessions(teacherId, date, date);
      for (const session of sessions) {
        if (session.id !== excludeSessionId &&
            this.timeSlotsOverlap(startTime, duration + availability.buffer_time, session.start_time, session.duration)) {
          return { available: false, reason: 'Conflicts with another session' };
        }
      }

      // Check minimum booking notice
      const now = new Date();
      const bookingTime = parseISO(`${date}T${startTime}`);
      const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilBooking < availability.min_booking_notice) {
        return { available: false, reason: `Requires ${availability.min_booking_notice} hours advance notice` };
      }

      // Check maximum booking advance
      const daysUntilBooking = hoursUntilBooking / 24;
      if (daysUntilBooking > availability.max_booking_advance) {
        return { available: false, reason: `Cannot book more than ${availability.max_booking_advance} days in advance` };
      }

      return { available: true };
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return { available: false, reason: 'Error checking availability' };
    }
  }

  /**
   * Get teacher schedule with timezone conversion
   */
  async getTeacherScheduleWithTimezone(
    teacherId: string,
    date: string,
    targetTimezone: string
  ): Promise<any> {
    try {
      const availability = await this.getTeacherAvailability(teacherId);
      if (!availability) {
        return null;
      }

      const teacherTimezone = availability.timezone || 'UTC';
      const dayOfWeek = DAYS_OF_WEEK[getDay(parseISO(date))];
      const daySchedule = availability.working_hours[dayOfWeek];

      if (!daySchedule?.enabled) {
        return null;
      }

      // Convert times from teacher timezone to target timezone
      const convertTime = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const dateTime = setMinutes(setHours(parseISO(date), hours), minutes);
        const teacherTime = fromZonedTime(dateTime, teacherTimezone);
        const targetTime = toZonedTime(teacherTime, targetTimezone);
        return format(targetTime, 'HH:mm');
      };

      return {
        ...daySchedule,
        start: convertTime(daySchedule.start),
        end: convertTime(daySchedule.end),
        breaks: daySchedule.breaks.map(b => ({
          start: convertTime(b.start),
          end: convertTime(b.end)
        })),
        originalTimezone: teacherTimezone,
        displayTimezone: targetTimezone
      };
    } catch (error) {
      console.error('Error getting teacher schedule with timezone:', error);
      throw error;
    }
  }

  // Helper methods
  private generateDaySlots(
    date: string,
    schedule: DaySchedule,
    duration: number,
    bufferTime: number,
    blocks: AvailabilityBlock[],
    sessions: any[],
    timezone: string
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    let currentTime = schedule.start;
    
    while (this.addMinutesToTime(currentTime, duration) <= schedule.end) {
      const endTime = this.addMinutesToTime(currentTime, duration);
      
      // Check if slot overlaps with breaks
      let overlapsBreak = false;
      for (const breakSlot of schedule.breaks || []) {
        if (this.timeSlotsOverlap(currentTime, duration, breakSlot.start, this.getMinutesBetween(breakSlot.start, breakSlot.end))) {
          overlapsBreak = true;
          break;
        }
      }
      
      // Check if slot is blocked
      let isBlocked = false;
      for (const block of blocks) {
        if (block.type === 'blocked' &&
            this.timeSlotsOverlap(currentTime, duration, block.start_time, this.getMinutesBetween(block.start_time, block.end_time))) {
          isBlocked = true;
          break;
        }
      }
      
      // Check if slot conflicts with existing sessions
      let hasConflict = false;
      for (const session of sessions) {
        // Skip if session doesn't have proper time data
        if (!session.start_time || !session.duration) {
          continue;
        }
        if (this.timeSlotsOverlap(currentTime, duration + bufferTime, session.start_time, session.duration + bufferTime)) {
          hasConflict = true;
          break;
        }
      }
      
      slots.push({
        date,
        start: currentTime,
        end: endTime,
        isAvailable: !overlapsBreak && !isBlocked && !hasConflict
      });
      
      // Move to next slot (with buffer time)
      currentTime = this.addMinutesToTime(currentTime, duration + bufferTime);
    }
    
    return slots;
  }

  private async getTeacherSessions(teacherId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      // Get all sessions where this teacher is involved
      // First get students taught by this teacher
      const studentsQuery = query(
        collection(db, 'students'),
        where('teacher_id', '==', teacherId)
      );
      
      const studentSnapshot = await getDocs(studentsQuery);
      const studentIds = studentSnapshot.docs.map(doc => doc.id);
      
      const sessions: any[] = [];
      
      // Query sessions for these students in batches
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
                // Extract time from the datetime or use scheduledTime field
                let timeStr = '00:00';
                if (sessionDate.includes('T')) {
                  timeStr = sessionDate.split('T')[1]?.substring(0, 5) || '00:00';
                } else if (session.scheduledTime) {
                  timeStr = session.scheduledTime;
                }
                
                const sessionData = {
                  ...session,
                  date: dateStr,
                  start_time: timeStr,
                  duration: session.duration_minutes || session.durationMinutes || 60
                };
                console.log('Session found for teacher:', { 
                  id: session.id, 
                  date: dateStr, 
                  time: timeStr, 
                  duration: sessionData.duration 
                });
                sessions.push(sessionData);
              }
            }
          });
        }
      }
      
      // Also check for sessions where the teacher is directly assigned (for admins/teachers)
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
            // Extract time from the datetime or use scheduledTime field
            let timeStr = '00:00';
            if (sessionDate.includes('T')) {
              timeStr = sessionDate.split('T')[1]?.substring(0, 5) || '00:00';
            } else if (session.scheduledTime) {
              timeStr = session.scheduledTime;
            }
            
            // Avoid duplicates
            if (!sessions.find(s => s.id === session.id)) {
              const sessionData = {
                ...session,
                date: dateStr,
                start_time: timeStr,
                duration: session.duration_minutes || session.durationMinutes || 60
              };
              console.log('Direct session found for teacher:', { 
                id: session.id, 
                date: dateStr, 
                time: timeStr, 
                duration: sessionData.duration 
              });
              sessions.push(sessionData);
            }
          }
        }
      });
      
      return sessions;
    } catch (error) {
      console.error('Error getting teacher sessions:', error);
      return [];
    }
  }

  private timeSlotsOverlap(
    start1: string,
    duration1: number,
    start2: string,
    duration2: number
  ): boolean {
    const start1Minutes = this.timeToMinutes(start1);
    const end1Minutes = start1Minutes + duration1;
    const start2Minutes = this.timeToMinutes(start2);
    const end2Minutes = start2Minutes + duration2;
    
    return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private addMinutesToTime(time: string, minutes: number): string {
    return this.minutesToTime(this.timeToMinutes(time) + minutes);
  }

  private getMinutesBetween(start: string, end: string): number {
    return this.timeToMinutes(end) - this.timeToMinutes(start);
  }
}

export const teacherAvailabilityService = new TeacherAvailabilityService();
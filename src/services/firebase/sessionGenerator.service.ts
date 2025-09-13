import { collection, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { addDays, addWeeks, setHours, setMinutes, format } from 'date-fns';

interface SessionGenerationConfig {
  subscriptionId: string;
  studentId: string;
  teacherId: string;
  schoolId: string;
  courseId: string;
  sessionCount: number;
  startDate: Date;
  endDate?: Date;
  schedule: {
    frequency: 'weekly' | 'biweekly' | 'daily';
    daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
    timeSlots: { hour: number; minute: number; duration: number }[];
  };
}

interface GeneratedSession {
  id: string;
  subscription_id: string;
  student_id: string;
  teacher_id: string;
  school_id: string;
  course_id: string;
  scheduled_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'cancellation_requested';
  session_number: number;
  total_sessions: number;
  cancellation_deadline: string;
  notes?: string;
  materials?: string;
  homework?: string;
  created_at: any;
  updated_at: any;
}

class SessionGeneratorService {
  /**
   * Generate sessions for a subscription
   */
  async generateSessions(config: SessionGenerationConfig): Promise<string[]> {
    console.log('=== SESSION GENERATION START ===');
    console.log('Config:', config);
    
    const sessionIds: string[] = [];
    const sessions: GeneratedSession[] = [];
    
    let currentDate = new Date(config.startDate);
    let sessionNumber = 1;
    
    // Calculate cancellation notice period (48 hours by default)
    const cancellationNoticeDays = 2;
    
    console.log('Starting generation loop...');
    console.log('Target session count:', config.sessionCount);
    console.log('Days of week:', config.schedule.daysOfWeek);
    
    while (sessionNumber <= config.sessionCount) {
      // Check if current date matches schedule
      const dayOfWeek = currentDate.getDay();
      console.log(`Checking date ${currentDate.toDateString()}, day of week: ${dayOfWeek}`);
      
      if (config.schedule.daysOfWeek.includes(dayOfWeek)) {
        // Generate sessions for each time slot on this day
        for (const timeSlot of config.schedule.timeSlots) {
          if (sessionNumber > config.sessionCount) break;
          
          // Set the time for the session
          const sessionDate = new Date(currentDate);
          sessionDate.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
          
          // Calculate cancellation deadline
          const cancellationDeadline = new Date(sessionDate);
          cancellationDeadline.setDate(cancellationDeadline.getDate() - cancellationNoticeDays);
          
          // Generate unique session ID
          const sessionId = doc(collection(db, 'lesson_sessions')).id;
          
          const session: GeneratedSession = {
            id: sessionId,
            subscription_id: config.subscriptionId,
            student_id: config.studentId,
            teacher_id: config.teacherId,
            school_id: config.schoolId,
            course_id: config.courseId,
            scheduled_date: sessionDate.toISOString(),
            duration_minutes: timeSlot.duration,
            status: 'scheduled',
            session_number: sessionNumber,
            total_sessions: config.sessionCount,
            cancellation_deadline: cancellationDeadline.toISOString(),
            notes: '',
            materials: '',
            homework: '',
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          };
          
          sessions.push(session);
          sessionIds.push(sessionId);
          console.log(`Created session #${sessionNumber} for ${sessionDate.toDateString()}`);
          sessionNumber++;
        }
      } else {
        console.log(`Skipping date ${currentDate.toDateString()} - not in schedule`);
      }
      
      // Move to next day/week based on frequency
      if (config.schedule.frequency === 'daily') {
        currentDate = addDays(currentDate, 1);
      } else if (config.schedule.frequency === 'weekly') {
        currentDate = addDays(currentDate, 1);
        // If we've checked all days of the week, move to next week
        if (currentDate.getDay() === 0) {
          currentDate = addDays(currentDate, 0); // Already moved to Sunday
        }
      } else if (config.schedule.frequency === 'biweekly') {
        currentDate = addWeeks(currentDate, 2);
      }
      
      // Stop if we've exceeded end date (if provided)
      if (config.endDate && currentDate > config.endDate) {
        break;
      }
    }
    
    console.log(`Prepared ${sessions.length} sessions to save`);
    
    if (sessions.length === 0) {
      console.warn('No sessions to save!');
      return [];
    }
    
    // Save all sessions to Firebase
    console.log('Saving sessions to Firebase...');
    const savePromises = sessions.map(session => {
      console.log(`Saving session ${session.id} for date ${session.scheduled_date}`);
      return setDoc(doc(db, 'lesson_sessions', session.id), session);
    });
    
    try {
      await Promise.all(savePromises);
      console.log(`✅ Successfully saved ${sessions.length} sessions to Firebase`);
    } catch (saveError) {
      console.error('❌ Error saving sessions to Firebase:', saveError);
      throw saveError;
    }
    
    console.log(`Generated ${sessions.length} sessions for subscription ${config.subscriptionId}`);
    console.log('Session IDs:', sessionIds);
    return sessionIds;
  }
  
  /**
   * Generate sessions with a simple weekly schedule
   */
  async generateWeeklySessions(
    subscriptionId: string,
    studentId: string,
    teacherId: string,
    schoolId: string,
    courseId: string,
    sessionCount: number,
    startDate: Date,
    sessionsPerWeek: number = 2
  ): Promise<string[]> {
    // Default schedule: Tuesday and Thursday at 10:00 AM
    const defaultDays = sessionsPerWeek === 1 ? [2] : [2, 4]; // Tuesday, Thursday
    
    const config: SessionGenerationConfig = {
      subscriptionId,
      studentId,
      teacherId,
      schoolId,
      courseId,
      sessionCount,
      startDate,
      schedule: {
        frequency: 'weekly',
        daysOfWeek: defaultDays,
        timeSlots: [{ hour: 10, minute: 0, duration: 60 }]
      }
    };
    
    return this.generateSessions(config);
  }
  
  /**
   * Cancel a session and optionally move it to the end of the subscription
   */
  async cancelSession(
    sessionId: string,
    moveToEnd: boolean = true,
    reason: string = 'Student requested'
  ): Promise<void> {
    try {
      // Update the session status
      await setDoc(doc(db, 'lesson_sessions', sessionId), {
        status: 'cancelled',
        cancellation_reason: reason,
        cancellation_date: serverTimestamp(),
        updated_at: serverTimestamp()
      }, { merge: true });
      
      if (moveToEnd) {
        // TODO: Implement logic to create a new session at the end of the subscription
        // This would involve:
        // 1. Finding the last session in the subscription
        // 2. Creating a new session after it
        // 3. Updating session numbers
      }
      
      console.log(`Session ${sessionId} cancelled. Move to end: ${moveToEnd}`);
    } catch (error) {
      console.error('Error cancelling session:', error);
      throw error;
    }
  }
  
  /**
   * Update session details (notes, materials, homework)
   */
  async updateSessionDetails(
    sessionId: string,
    details: {
      notes?: string;
      materials?: string;
      homework?: string;
    }
  ): Promise<void> {
    try {
      await setDoc(doc(db, 'lesson_sessions', sessionId), {
        ...details,
        updated_at: serverTimestamp()
      }, { merge: true });
      
      console.log(`Session ${sessionId} details updated`);
    } catch (error) {
      console.error('Error updating session details:', error);
      throw error;
    }
  }
  
  /**
   * Check if a session can be cancelled based on deadline
   */
  canCancelSession(session: any): boolean {
    const now = new Date();
    const deadline = new Date(session.cancellation_deadline);
    return now < deadline;
  }
  
  /**
   * Get cancellation deadline message
   */
  getCancellationDeadlineMessage(session: any): string {
    const deadline = new Date(session.cancellation_deadline);
    const now = new Date();
    const hoursUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursUntilDeadline < 0) {
      return 'Cancellation deadline has passed';
    } else if (hoursUntilDeadline < 24) {
      return `Cancel within ${hoursUntilDeadline} hours`;
    } else {
      const days = Math.floor(hoursUntilDeadline / 24);
      return `Cancel within ${days} day${days > 1 ? 's' : ''}`;
    }
  }
}

export const sessionGeneratorService = new SessionGeneratorService();
export default sessionGeneratorService;
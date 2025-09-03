
import { format } from 'date-fns';
import { databaseService } from '@/services/firebase/database.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SessionTime {
  teacherId: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format
  durationMinutes: number;
  excludeSessionId?: string; // For rescheduling - exclude the session being moved
}

interface ConflictingSession {
  id: string;
  startTime: string;
  endTime: string;
  studentName: string;
  isGroup: boolean;
  groupName?: string;
}

export interface TeacherOverlapValidationResult {
  hasConflict: boolean;
  conflictMessage?: string;
  conflictingSessions?: ConflictingSession[];
}

// Helper function to convert time string to minutes since midnight
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert minutes since midnight back to time string
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Helper function to format time for display (12-hour format)
const formatTimeForDisplay = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Helper function to get day name from date
const getDayName = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

export const validateTeacherScheduleOverlap = async (
  sessionTime: SessionTime
): Promise<TeacherOverlapValidationResult> => {
  try {
    const { teacherId, date, startTime, durationMinutes, excludeSessionId } = sessionTime;
    
    // Convert new session times to minutes
    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = newStartMinutes + durationMinutes;
    
    // For now, skip validation in Firebase environment to avoid index issues
    // TODO: Implement proper Firebase validation with correct indexes
    console.log('Teacher schedule validation temporarily disabled for Firebase');
    return { hasConflict: false };
    
    /* Firebase implementation - disabled until indexes are created
    try {
      // Create date range for the query
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);
      
      // Query for sessions where this teacher is involved
      const sessionsRef = collection(db, 'lesson_sessions');
      const q = query(
        sessionsRef,
        where('teacher_id', '==', teacherId),
        where('scheduled_date', '>=', startOfDay.toISOString()),
        where('scheduled_date', '<=', endOfDay.toISOString()),
        where('status', '==', 'scheduled')
      );
      
      const querySnapshot = await getDocs(q);
      const existingSessions = [];
      
      querySnapshot.forEach((doc) => {
        const session = { id: doc.id, ...doc.data() };
        if (session.id !== excludeSessionId) {
          existingSessions.push(session);
        }
      });
      
      if (existingSessions.length === 0) {
        return { hasConflict: false };
      }
    } catch (firebaseError) {
      console.error('Firebase query error:', firebaseError);
      // Return no conflict on error to allow operation to proceed
      return { hasConflict: false };
    }
    */


  } catch (error) {
    console.error('Error validating teacher schedule overlap:', error);
    return { hasConflict: false };
  }
};

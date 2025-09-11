
import { format } from 'date-fns';
import { databaseService } from '@/services/firebase/database.service';
import { collection, query, where, getDocs, and } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { teacherAvailabilityService } from '@/services/firebase/teacherAvailability.service';

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
  sessionTime: SessionTime,
  isAdmin?: boolean
): Promise<TeacherOverlapValidationResult> => {
  try {
    const { teacherId, date, startTime, durationMinutes, excludeSessionId } = sessionTime;
    
    // First check teacher availability if configured
    const availabilityCheck = await teacherAvailabilityService.checkSlotAvailability(
      teacherId,
      date,
      startTime,
      durationMinutes,
      excludeSessionId,
      isAdmin
    );
    
    if (!availabilityCheck.available) {
      return {
        hasConflict: true,
        conflictMessage: availabilityCheck.reason || 'Time slot is not available'
      };
    }
    
    // Convert new session times to minutes
    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = newStartMinutes + durationMinutes;
    
    console.log('Validating teacher schedule for:', { teacherId, date, startTime, durationMinutes });
    
    try {
      // First, get all students taught by this teacher
      const studentsRef = collection(db, 'students');
      const studentQuery = query(
        studentsRef,
        where('teacher_id', '==', teacherId)
      );
      
      const studentSnapshot = await getDocs(studentQuery);
      const studentIds = [];
      const studentNames = {};
      
      studentSnapshot.forEach((doc) => {
        const studentData = doc.data();
        studentIds.push(doc.id);
        // Store student names for later use
        studentNames[doc.id] = `${studentData.firstName || studentData.first_name || ''} ${studentData.lastName || studentData.last_name || ''}`;
      });
      
      if (studentIds.length === 0) {
        console.log('No students found for teacher:', teacherId);
        return { hasConflict: false };
      }
      
      console.log('Found students for teacher:', studentIds);
      
      // Now query sessions for these students on the given date
      // We need to check sessions that are scheduled for the same day
      const sessionsRef = collection(db, 'lesson_sessions');
      
      // Create date range for the query (using date strings for comparison)
      const dateStart = `${date}T00:00:00`;
      const dateEnd = `${date}T23:59:59`;
      
      // Query sessions for all students of this teacher on the given date
      const existingSessions = [];
      
      // We need to query in batches if there are many students (Firestore limit is 10 for 'in' queries)
      const batchSize = 10;
      for (let i = 0; i < studentIds.length; i += batchSize) {
        const batch = studentIds.slice(i, i + batchSize);
        
        const sessionQuery = query(
          sessionsRef,
          and(
            where('studentId', 'in', batch),  // Fixed: use 'studentId' not 'student_id'
            where('status', '==', 'scheduled')
          )
        );
        
        console.log(`Querying sessions for students:`, batch);
        const sessionSnapshot = await getDocs(sessionQuery);
        console.log(`Found ${sessionSnapshot.size} scheduled sessions for this batch`);
        
        sessionSnapshot.forEach((doc) => {
          const session = { id: doc.id, ...doc.data() };
          
          // Check if this session is on the same date
          // Handle different date field formats
          const sessionDateField = session.scheduledDateTime || session.scheduled_date || session.scheduledDate;
          if (sessionDateField) {
            // Parse the date properly
            const sessionDate = new Date(sessionDateField);
            const targetDate = new Date(date);
            
            // Check if it's the same day
            if (sessionDate.toDateString() === targetDate.toDateString()) {
              // Exclude the session being rescheduled
              if (session.id !== excludeSessionId) {
                existingSessions.push(session);
              }
            }
          }
        });
      }
      
      if (existingSessions.length === 0) {
        console.log('No existing sessions found for this teacher on', date);
        return { hasConflict: false };
      }
      
      console.log('Found existing sessions:', existingSessions.length);
      
      // Check for conflicts
      const conflictingSessions: ConflictingSession[] = [];
      const dayName = getDayName(date);
      
      for (const session of existingSessions) {
        // Get the session date/time
        const sessionDateStr = session.scheduledDateTime || session.scheduled_date || session.scheduledDate;
        const sessionDate = new Date(sessionDateStr);
        
        // Extract time from the date or use scheduledTime if available
        let existingStartTime;
        if (session.scheduledTime) {
          existingStartTime = session.scheduledTime;
        } else {
          existingStartTime = format(sessionDate, 'HH:mm');
        }
        
        const existingStartMinutes = timeToMinutes(existingStartTime);
        const existingEndMinutes = existingStartMinutes + (session.durationMinutes || session.duration_minutes || 60);
        
        // Check for overlap
        const hasOverlap = (
          (newStartMinutes < existingEndMinutes) && 
          (newEndMinutes > existingStartMinutes)
        );
        
        if (hasOverlap) {
          const studentId = session.student_id || session.studentId;
          const studentName = studentNames[studentId] || 'Unknown Student';
          const groupId = session.group_id || session.groupId;
          
          conflictingSessions.push({
            id: session.id,
            startTime: formatTimeForDisplay(existingStartTime),
            endTime: formatTimeForDisplay(minutesToTime(existingEndMinutes)),
            studentName,
            isGroup: !!groupId,
            groupName: session.groupName
          });
        }
      }
      
      if (conflictingSessions.length > 0) {
        const newStartDisplay = formatTimeForDisplay(startTime);
        const newEndDisplay = formatTimeForDisplay(minutesToTime(newEndMinutes));
        
        // Create a user-friendly conflict message
        const conflictDetails = conflictingSessions
          .map(session => {
            const sessionType = session.isGroup ? `Group: ${session.groupName}` : session.studentName;
            return `${sessionType} (${session.startTime} - ${session.endTime})`;
          })
          .join(', ');
        
        const conflictMessage = `This teacher already has a session scheduled from ${conflictingSessions[0].startTime} to ${conflictingSessions[0].endTime} on ${dayName}. The new session (${newStartDisplay} - ${newEndDisplay}) would overlap with: ${conflictDetails}. Please choose a different time.`;
        
        return {
          hasConflict: true,
          conflictMessage,
          conflictingSessions
        };
      }
      
      return { hasConflict: false };
      
    } catch (firebaseError) {
      console.error('Firebase query error:', firebaseError);
      // Return no conflict on error to allow operation to proceed
      // This prevents blocking users if there's an issue with the query
      return { hasConflict: false };
    }


  } catch (error) {
    console.error('Error validating teacher schedule overlap:', error);
    return { hasConflict: false };
  }
};

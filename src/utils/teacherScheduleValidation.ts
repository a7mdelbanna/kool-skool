
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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

export const validateTeacherScheduleOverlap = async (
  sessionTime: SessionTime
): Promise<TeacherOverlapValidationResult> => {
  try {
    const { teacherId, date, startTime, durationMinutes, excludeSessionId } = sessionTime;
    
    // Convert new session times to minutes
    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = newStartMinutes + durationMinutes;
    
    // Query for existing sessions on the same date for this teacher
    // We need to check both individual sessions and group sessions
    const { data: existingSessions, error } = await supabase
      .from('lesson_sessions')
      .select(`
        id,
        scheduled_date,
        duration_minutes,
        students!lesson_sessions_student_id_fkey(
          users!students_user_id_fkey(first_name, last_name)
        ),
        groups(
          id,
          name
        )
      `)
      .eq('students.teacher_id', teacherId)
      .gte('scheduled_date', `${date}T00:00:00`)
      .lt('scheduled_date', `${date}T23:59:59`)
      .eq('status', 'scheduled')
      .neq('id', excludeSessionId || ''); // Exclude the session being rescheduled

    if (error) {
      console.error('Error checking teacher schedule:', error);
      return { hasConflict: false };
    }

    if (!existingSessions || existingSessions.length === 0) {
      return { hasConflict: false };
    }

    const conflictingSessions: ConflictingSession[] = [];

    // Check each existing session for overlap
    for (const session of existingSessions) {
      const sessionDate = new Date(session.scheduled_date);
      const existingStartTime = format(sessionDate, 'HH:mm');
      const existingStartMinutes = timeToMinutes(existingStartTime);
      const existingEndMinutes = existingStartMinutes + (session.duration_minutes || 60);

      // Check for overlap: sessions overlap if one starts before the other ends
      const hasOverlap = (
        (newStartMinutes < existingEndMinutes) && 
        (newEndMinutes > existingStartMinutes)
      );

      if (hasOverlap) {
        const isGroup = !!session.groups;
        const studentName = session.students?.users ? 
          `${session.students.users.first_name} ${session.students.users.last_name}` : 
          'Unknown Student';

        conflictingSessions.push({
          id: session.id,
          startTime: formatTimeForDisplay(existingStartTime),
          endTime: formatTimeForDisplay(minutesToTime(existingEndMinutes)),
          studentName,
          isGroup,
          groupName: session.groups?.name
        });
      }
    }

    if (conflictingSessions.length > 0) {
      const newStartDisplay = formatTimeForDisplay(startTime);
      const newEndDisplay = formatTimeForDisplay(minutesToTime(newEndMinutes));
      
      const conflictDetails = conflictingSessions
        .map(session => {
          const sessionType = session.isGroup ? `Group: ${session.groupName}` : session.studentName;
          return `${sessionType} (${session.startTime} - ${session.endTime})`;
        })
        .join(', ');

      const conflictMessage = `This teacher already has another session scheduled between ${newStartDisplay} and ${newEndDisplay}. Conflicting session(s): ${conflictDetails}. Please select a different time.`;

      return {
        hasConflict: true,
        conflictMessage,
        conflictingSessions
      };
    }

    return { hasConflict: false };

  } catch (error) {
    console.error('Error validating teacher schedule overlap:', error);
    return { hasConflict: false };
  }
};

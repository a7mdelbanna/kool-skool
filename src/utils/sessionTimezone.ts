
import { getSchoolTimezone, convertSchoolTimeToUTC, getEffectiveTimezone } from './timezone';

/**
 * Create a session datetime using school timezone as the default
 * This ensures all new sessions are created in the school's timezone context
 */
export const createSessionInSchoolTimezone = async (
  date: Date,
  time: string,
  schoolId: string
): Promise<Date> => {
  // Parse time (assumes format like "14:30" or "2:30 PM")
  const [hours, minutes] = time.includes(':') 
    ? time.split(':').map(str => parseInt(str.replace(/[^\d]/g, '')))
    : [parseInt(time.split(' ')[0]), 0];
  
  // Create datetime in local context (school timezone)
  const localDateTime = new Date(date);
  localDateTime.setHours(hours, minutes, 0, 0);
  
  // Convert to UTC for storage using school timezone
  return await convertSchoolTimeToUTC(localDateTime, schoolId);
};

/**
 * Format session time for admin/teacher interfaces in their viewing timezone
 */
export const formatSessionForAdminView = (
  sessionDate: Date | string,
  userTimezone?: string
): string => {
  const effectiveTimezone = getEffectiveTimezone(userTimezone);
  const date = typeof sessionDate === 'string' ? new Date(sessionDate) : sessionDate;
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: effectiveTimezone,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

/**
 * Get timezone context information for session creation
 */
export const getSessionTimezoneContext = async (schoolId: string, userTimezone?: string) => {
  const schoolTz = await getSchoolTimezone(schoolId);
  const userTz = getEffectiveTimezone(userTimezone);
  
  return {
    schoolTimezone: schoolTz,
    userTimezone: userTz,
    isTimezoneConflict: schoolTz !== userTz,
    message: schoolTz !== userTz 
      ? `Sessions will be created in school timezone (${schoolTz}) and displayed in your timezone (${userTz})`
      : `Using timezone: ${schoolTz}`
  };
};


import { format, parseISO, toZonedTime, fromZonedTime } from 'date-fns-tz';

// Common timezone options for the UI
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
  { value: 'America/New_York', label: 'Eastern Time (New York)', offset: '-05:00/-04:00' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', offset: '-06:00/-05:00' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', offset: '-07:00/-06:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', offset: '-08:00/-07:00' },
  { value: 'Europe/London', label: 'GMT/BST (London)', offset: '+00:00/+01:00' },
  { value: 'Europe/Paris', label: 'CET/CEST (Paris)', offset: '+01:00/+02:00' },
  { value: 'Europe/Berlin', label: 'CET/CEST (Berlin)', offset: '+01:00/+02:00' },
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)', offset: '+08:00' },
  { value: 'Asia/Dubai', label: 'GST (Dubai)', offset: '+04:00' },
  { value: 'Australia/Sydney', label: 'AEST/AEDT (Sydney)', offset: '+10:00/+11:00' },
];

/**
 * Convert a UTC date to the user's timezone
 */
export const convertUTCToUserTimezone = (utcDate: Date | string, userTimezone: string): Date => {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return toZonedTime(date, userTimezone);
};

/**
 * Convert a local date/time to UTC for storage
 */
export const convertUserTimezoneToUTC = (localDate: Date, userTimezone: string): Date => {
  return fromZonedTime(localDate, userTimezone);
};

/**
 * Format a date in the user's timezone
 */
export const formatInUserTimezone = (
  date: Date | string, 
  userTimezone: string, 
  formatString: string = 'yyyy-MM-dd HH:mm'
): string => {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  return format(utcDate, formatString, { timeZone: userTimezone });
};

/**
 * Get the user's browser timezone as fallback
 */
export const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

/**
 * Get the effective timezone for a user (user setting > browser > UTC)
 */
export const getEffectiveTimezone = (userTimezone?: string | null): string => {
  return userTimezone || getBrowserTimezone() || 'UTC';
};

/**
 * Format time for display in 12/24 hour format
 */
export const formatTimeDisplay = (
  date: Date | string,
  userTimezone: string,
  use24Hour: boolean = false
): string => {
  const formatString = use24Hour ? 'HH:mm' : 'h:mm a';
  return formatInUserTimezone(date, userTimezone, formatString);
};

/**
 * Format date and time for display
 */
export const formatDateTimeDisplay = (
  date: Date | string,
  userTimezone: string,
  use24Hour: boolean = false
): string => {
  const formatString = use24Hour ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy h:mm a';
  return formatInUserTimezone(date, userTimezone, formatString);
};

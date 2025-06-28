import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';

// Comprehensive timezone options for the UI
export const COMMON_TIMEZONES = [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
  
  // Americas
  { value: 'America/New_York', label: 'Eastern Time (New York)', offset: '-05:00/-04:00' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', offset: '-06:00/-05:00' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', offset: '-07:00/-06:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', offset: '-08:00/-07:00' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)', offset: '-09:00/-08:00' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)', offset: '-10:00' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', offset: '-05:00/-04:00' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', offset: '-08:00/-07:00' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)', offset: '-03:00/-02:00' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina Time (Buenos Aires)', offset: '-03:00' },
  { value: 'America/Mexico_City', label: 'Central Time (Mexico City)', offset: '-06:00/-05:00' },
  { value: 'America/Lima', label: 'Peru Time (Lima)', offset: '-05:00' },
  { value: 'America/Bogota', label: 'Colombia Time (Bogotá)', offset: '-05:00' },
  { value: 'America/Caracas', label: 'Venezuela Time (Caracas)', offset: '-04:00' },
  { value: 'America/Santiago', label: 'Chile Time (Santiago)', offset: '-04:00/-03:00' },
  
  // Europe
  { value: 'Europe/London', label: 'GMT/BST (London)', offset: '+00:00/+01:00' },
  { value: 'Europe/Paris', label: 'CET/CEST (Paris)', offset: '+01:00/+02:00' },
  { value: 'Europe/Berlin', label: 'CET/CEST (Berlin)', offset: '+01:00/+02:00' },
  { value: 'Europe/Madrid', label: 'CET/CEST (Madrid)', offset: '+01:00/+02:00' },
  { value: 'Europe/Rome', label: 'CET/CEST (Rome)', offset: '+01:00/+02:00' },
  { value: 'Europe/Amsterdam', label: 'CET/CEST (Amsterdam)', offset: '+01:00/+02:00' },
  { value: 'Europe/Vienna', label: 'CET/CEST (Vienna)', offset: '+01:00/+02:00' },
  { value: 'Europe/Zurich', label: 'CET/CEST (Zurich)', offset: '+01:00/+02:00' },
  { value: 'Europe/Prague', label: 'CET/CEST (Prague)', offset: '+01:00/+02:00' },
  { value: 'Europe/Warsaw', label: 'CET/CEST (Warsaw)', offset: '+01:00/+02:00' },
  { value: 'Europe/Stockholm', label: 'CET/CEST (Stockholm)', offset: '+01:00/+02:00' },
  { value: 'Europe/Copenhagen', label: 'CET/CEST (Copenhagen)', offset: '+01:00/+02:00' },
  { value: 'Europe/Oslo', label: 'CET/CEST (Oslo)', offset: '+01:00/+02:00' },
  { value: 'Europe/Helsinki', label: 'EET/EEST (Helsinki)', offset: '+02:00/+03:00' },
  { value: 'Europe/Athens', label: 'EET/EEST (Athens)', offset: '+02:00/+03:00' },
  { value: 'Europe/Istanbul', label: 'Turkey Time (Istanbul)', offset: '+03:00' },
  { value: 'Europe/Moscow', label: 'Moscow Time (Moscow)', offset: '+03:00' },
  { value: 'Europe/Kiev', label: 'EET/EEST (Kiev)', offset: '+02:00/+03:00' },
  { value: 'Europe/Bucharest', label: 'EET/EEST (Bucharest)', offset: '+02:00/+03:00' },
  { value: 'Europe/Dublin', label: 'GMT/IST (Dublin)', offset: '+00:00/+01:00' },
  { value: 'Europe/Lisbon', label: 'WET/WEST (Lisbon)', offset: '+00:00/+01:00' },
  
  // Asia
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: 'HKT (Hong Kong)', offset: '+08:00' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore)', offset: '+08:00' },
  { value: 'Asia/Seoul', label: 'KST (Seoul)', offset: '+09:00' },
  { value: 'Asia/Taipei', label: 'CST (Taipei)', offset: '+08:00' },
  { value: 'Asia/Manila', label: 'PST (Manila)', offset: '+08:00' },
  { value: 'Asia/Bangkok', label: 'ICT (Bangkok)', offset: '+07:00' },
  { value: 'Asia/Jakarta', label: 'WIB (Jakarta)', offset: '+07:00' },
  { value: 'Asia/Kuala_Lumpur', label: 'MYT (Kuala Lumpur)', offset: '+08:00' },
  { value: 'Asia/Mumbai', label: 'IST (Mumbai)', offset: '+05:30' },
  { value: 'Asia/Kolkata', label: 'IST (Kolkata)', offset: '+05:30' },
  { value: 'Asia/Dubai', label: 'GST (Dubai)', offset: '+04:00' },
  { value: 'Asia/Riyadh', label: 'AST (Riyadh)', offset: '+03:00' },
  { value: 'Asia/Tehran', label: 'IRST (Tehran)', offset: '+03:30/+04:30' },
  { value: 'Asia/Karachi', label: 'PKT (Karachi)', offset: '+05:00' },
  { value: 'Asia/Tashkent', label: 'UZT (Tashkent)', offset: '+05:00' },
  { value: 'Asia/Almaty', label: 'ALMT (Almaty)', offset: '+06:00' },
  { value: 'Asia/Dhaka', label: 'BST (Dhaka)', offset: '+06:00' },
  { value: 'Asia/Yekaterinburg', label: 'YEKT (Yekaterinburg)', offset: '+05:00' },
  { value: 'Asia/Novosibirsk', label: 'NOVT (Novosibirsk)', offset: '+07:00' },
  { value: 'Asia/Vladivostok', label: 'VLAT (Vladivostok)', offset: '+10:00' },
  
  // Africa
  { value: 'Africa/Lagos', label: 'WAT (Lagos)', offset: '+01:00' },
  { value: 'Africa/Cairo', label: 'EET (Cairo)', offset: '+02:00' },
  { value: 'Africa/Johannesburg', label: 'SAST (Johannesburg)', offset: '+02:00' },
  { value: 'Africa/Nairobi', label: 'EAT (Nairobi)', offset: '+03:00' },
  { value: 'Africa/Casablanca', label: 'WET (Casablanca)', offset: '+00:00/+01:00' },
  { value: 'Africa/Algiers', label: 'CET (Algiers)', offset: '+01:00' },
  { value: 'Africa/Tunis', label: 'CET (Tunis)', offset: '+01:00' },
  { value: 'Africa/Addis_Ababa', label: 'EAT (Addis Ababa)', offset: '+03:00' },
  
  // Oceania
  { value: 'Australia/Sydney', label: 'AEST/AEDT (Sydney)', offset: '+10:00/+11:00' },
  { value: 'Australia/Melbourne', label: 'AEST/AEDT (Melbourne)', offset: '+10:00/+11:00' },
  { value: 'Australia/Brisbane', label: 'AEST (Brisbane)', offset: '+10:00' },
  { value: 'Australia/Perth', label: 'AWST (Perth)', offset: '+08:00' },
  { value: 'Australia/Adelaide', label: 'ACST/ACDT (Adelaide)', offset: '+09:30/+10:30' },
  { value: 'Pacific/Auckland', label: 'NZST/NZDT (Auckland)', offset: '+12:00/+13:00' },
  { value: 'Pacific/Fiji', label: 'FJT (Fiji)', offset: '+12:00/+13:00' },
  { value: 'Pacific/Tahiti', label: 'TAHT (Tahiti)', offset: '-10:00' },
  
  // Additional Pacific
  { value: 'Pacific/Guam', label: 'ChST (Guam)', offset: '+10:00' },
  { value: 'Pacific/Samoa', label: 'SST (Samoa)', offset: '-11:00' },
  { value: 'Pacific/Tonga', label: 'TOT (Tonga)', offset: '+13:00' },
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
  try {
    const utcDate = typeof date === 'string' ? parseISO(date) : date;
    console.log('formatInUserTimezone - Input date:', utcDate);
    console.log('formatInUserTimezone - User timezone:', userTimezone);
    console.log('formatInUserTimezone - Format string:', formatString);
    
    // Convert UTC date to user timezone first
    const zonedDate = toZonedTime(utcDate, userTimezone);
    console.log('formatInUserTimezone - Zoned date:', zonedDate);
    
    // Format the zoned date using the timezone
    const result = format(zonedDate, formatString, { timeZone: userTimezone });
    console.log('formatInUserTimezone - Final result:', result);
    
    return result;
  } catch (error) {
    console.error('formatInUserTimezone - Error:', error);
    // Fallback to basic formatting
    const fallbackDate = typeof date === 'string' ? parseISO(date) : date;
    return format(fallbackDate, formatString, { timeZone: userTimezone });
  }
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
 * Get the school's timezone for session creation
 */
export const getSchoolTimezone = async (schoolId: string): Promise<string> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('schools')
      .select('timezone')
      .eq('id', schoolId)
      .single();

    if (error) {
      console.warn('Could not fetch school timezone:', error.message);
      return 'UTC';
    }

    return data?.timezone || 'UTC';
  } catch (error) {
    console.warn('Error fetching school timezone:', error);
    return 'UTC';
  }
};

/**
 * Convert a date/time from school timezone to UTC for storage
 */
export const convertSchoolTimeToUTC = async (
  localDate: Date, 
  schoolId: string
): Promise<Date> => {
  const schoolTimezone = await getSchoolTimezone(schoolId);
  return fromZonedTime(localDate, schoolTimezone);
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

/**
 * Format date and time for display with timezone abbreviation
 */
export const formatDateTimeDisplayWithTimezone = (
  date: Date | string,
  userTimezone: string,
  use24Hour: boolean = false
): string => {
  const formatString = use24Hour ? 'MMM d, yyyy HH:mm zzz' : 'MMM d, yyyy h:mm a zzz';
  return formatInUserTimezone(date, userTimezone, formatString);
};

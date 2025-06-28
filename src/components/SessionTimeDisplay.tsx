
import React, { useContext } from 'react';
import { formatInUserTimezone, getEffectiveTimezone } from '@/utils/timezone';
import { UserContext } from '@/App';

interface SessionTimeDisplayProps {
  date: Date | string;
  showDate?: boolean;
  showTime?: boolean;
  use24Hour?: boolean;
  className?: string;
}

const SessionTimeDisplay: React.FC<SessionTimeDisplayProps> = ({
  date,
  showDate = true,
  showTime = true,
  use24Hour = false,
  className = ''
}) => {
  const { user } = useContext(UserContext);
  const userTimezone = getEffectiveTimezone(user?.timezone);
  
  console.log('SessionTimeDisplay - Input date:', date);
  console.log('SessionTimeDisplay - User timezone:', userTimezone);
  console.log('SessionTimeDisplay - User object:', user);
  
  if (!date) return <span className={className}>--</span>;
  
  const getFormatString = () => {
    if (showDate && showTime) {
      return use24Hour ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy h:mm a';
    } else if (showDate) {
      return 'MMM d, yyyy';
    } else if (showTime) {
      return use24Hour ? 'HH:mm' : 'h:mm a';
    }
    return 'MMM d, yyyy h:mm a';
  };
  
  try {
    const formattedDateTime = formatInUserTimezone(date, userTimezone, getFormatString());
    console.log('SessionTimeDisplay - Formatted result:', formattedDateTime);
    
    return (
      <span className={className} title={`${formattedDateTime} (${userTimezone})`}>
        {formattedDateTime}
      </span>
    );
  } catch (error) {
    console.error('SessionTimeDisplay - Error formatting date:', error);
    return <span className={className}>Invalid Date</span>;
  }
};

export default SessionTimeDisplay;

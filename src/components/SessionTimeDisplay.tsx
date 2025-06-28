
import React, { useContext } from 'react';
import { formatDateTimeDisplay, getEffectiveTimezone } from '@/utils/timezone';
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
  
  if (!date) return <span className={className}>--</span>;
  
  const formatString = () => {
    if (showDate && showTime) {
      return use24Hour ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy h:mm a';
    } else if (showDate) {
      return 'MMM d, yyyy';
    } else if (showTime) {
      return use24Hour ? 'HH:mm' : 'h:mm a';
    }
    return 'MMM d, yyyy h:mm a';
  };
  
  const formattedDateTime = formatDateTimeDisplay(date, userTimezone, use24Hour);
  
  return (
    <span className={className} title={`${formattedDateTime} (${userTimezone})`}>
      {formattedDateTime}
    </span>
  );
};

export default SessionTimeDisplay;

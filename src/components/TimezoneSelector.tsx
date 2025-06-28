
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { COMMON_TIMEZONES } from '@/utils/timezone';

interface TimezoneSelectorProps {
  value?: string;
  onValueChange: (timezone: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  value,
  onValueChange,
  label = "Timezone",
  placeholder = "Select timezone",
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="timezone">{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id="timezone">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {COMMON_TIMEZONES.map((timezone) => (
            <SelectItem key={timezone.value} value={timezone.value}>
              <div className="flex flex-col">
                <span className="font-medium">{timezone.label}</span>
                <span className="text-xs text-muted-foreground">{timezone.offset}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimezoneSelector;

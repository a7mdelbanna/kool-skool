
import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select time",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [timeStr] = value.split(' ');
      const [h, m] = timeStr.split(':').map(Number);
      
      if (h === 0) {
        setHours(12);
        setPeriod('AM');
      } else if (h < 12) {
        setHours(h);
        setPeriod('AM');
      } else if (h === 12) {
        setHours(12);
        setPeriod('PM');
      } else {
        setHours(h - 12);
        setPeriod('PM');
      }
      
      setMinutes(m);
    }
  }, [value]);

  const formatTime = (h: number, m: number, p: 'AM' | 'PM') => {
    const hour24 = p === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
    return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (newHours: number, newMinutes: number, newPeriod: 'AM' | 'PM') => {
    const timeString = formatTime(newHours, newMinutes, newPeriod);
    onChange(timeString);
  };

  const adjustHours = (increment: boolean) => {
    const newHours = increment 
      ? (hours === 12 ? 1 : hours + 1)
      : (hours === 1 ? 12 : hours - 1);
    setHours(newHours);
    handleTimeChange(newHours, minutes, period);
  };

  const adjustMinutes = (increment: boolean) => {
    const newMinutes = increment 
      ? (minutes === 59 ? 0 : minutes + 1)
      : (minutes === 0 ? 59 : minutes - 1);
    setMinutes(newMinutes);
    handleTimeChange(hours, newMinutes, period);
  };

  const togglePeriod = () => {
    const newPeriod = period === 'AM' ? 'PM' : 'AM';
    setPeriod(newPeriod);
    handleTimeChange(hours, minutes, newPeriod);
  };

  const displayTime = value ? 
    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}` : 
    placeholder;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayTime}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="bg-popover rounded-lg shadow-lg border border-border p-4">
          <div className="flex items-center justify-center space-x-2">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adjustHours(true)}
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="text-2xl font-bold w-12 text-center py-2 text-foreground">
                {hours.toString().padStart(2, '0')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adjustHours(false)}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-2xl font-bold text-foreground">:</div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adjustMinutes(true)}
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="text-2xl font-bold w-12 text-center py-2 text-foreground">
                {minutes.toString().padStart(2, '0')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adjustMinutes(false)}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* AM/PM */}
            <div className="flex flex-col items-center ml-2">
              <Button
                variant={period === 'AM' ? 'default' : 'outline'}
                size="sm"
                onClick={togglePeriod}
                className="h-8 w-12 text-xs mb-1"
              >
                AM
              </Button>
              <Button
                variant={period === 'PM' ? 'default' : 'outline'}
                size="sm"
                onClick={togglePeriod}
                className="h-8 w-12 text-xs"
              >
                PM
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimePicker;

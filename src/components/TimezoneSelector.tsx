
import React, { useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [open, setOpen] = useState(false);

  const selectedTimezone = COMMON_TIMEZONES.find(
    (timezone) => timezone.value === value
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="timezone">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px] px-3 py-2"
            disabled={disabled}
            id="timezone"
          >
            {selectedTimezone ? (
              <div className="flex flex-col items-start text-left">
                <span className="font-medium">{selectedTimezone.label}</span>
                <span className="text-xs text-muted-foreground">{selectedTimezone.offset}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search timezones..." 
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>No timezone found.</CommandEmpty>
              <CommandGroup>
                {COMMON_TIMEZONES.map((timezone) => (
                  <CommandItem
                    key={timezone.value}
                    value={`${timezone.label} ${timezone.value} ${timezone.offset}`}
                    onSelect={() => {
                      onValueChange(timezone.value);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-3"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === timezone.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm">{timezone.label}</span>
                      <span className="text-xs text-muted-foreground">{timezone.offset}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TimezoneSelector;

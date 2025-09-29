import React, { useState, useRef, useEffect } from 'react';
import { Search, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  className,
  placeholder = "Search..."
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for "/" key to focus search
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Focus on "/" key unless in another input
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Clear on Escape when focused
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setSearchValue('');
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Open global command center
  const openCommandCenter = () => {
    const event = new CustomEvent('openGlobalSearch');
    window.dispatchEvent(event);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchValue) {
                openCommandCenter();
              }
            }}
            className={cn(
              "pl-9 pr-20 h-9",
              "bg-background/50 backdrop-blur-sm",
              "border-white/10 hover:border-white/20",
              "transition-all duration-200",
              isFocused && "border-primary/50 shadow-lg shadow-primary/5"
            )}
            data-search-input
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {!isFocused && (
              <>
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">/</span>
                </kbd>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={openCommandCenter}
                >
                  <Command className="h-3 w-3 mr-1" />
                  <span className="text-xs hidden lg:inline">
                    {formatShortcut({ key: 'k', ctrlKey: true })}
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick search suggestions popover */}
      <Popover open={isFocused && !searchValue}>
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-2"
          align="start"
          sideOffset={5}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground px-2">Quick Searches</div>
            <div className="space-y-1">
              <button
                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  setSearchValue('overdue payments');
                  openCommandCenter();
                }}
              >
                <span className="text-red-500 mr-2">•</span>
                Overdue payments
              </button>
              <button
                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  setSearchValue("today's lessons");
                  openCommandCenter();
                }}
              >
                <span className="text-green-500 mr-2">•</span>
                Today's lessons
              </button>
              <button
                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  setSearchValue('new students');
                  openCommandCenter();
                }}
              >
                <span className="text-blue-500 mr-2">•</span>
                Recent students
              </button>
            </div>
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground px-2">
                Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Enter</kbd> or{' '}
                <kbd className="px-1 py-0.5 text-xs bg-muted rounded">
                  {formatShortcut({ key: 'k', ctrlKey: true })}
                </kbd>{' '}
                for advanced search
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SearchBar;
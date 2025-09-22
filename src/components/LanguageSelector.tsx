import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Languages } from 'lucide-react';
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

interface Language {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

interface LanguageSelectorProps {
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className }) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('userLanguage', langCode);
    setOpen(false);
    // Reload to ensure all components update with new language
    window.location.reload();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center text-slate-400 mb-2">
        <Languages className="h-4 w-4 mr-2 text-slate-500" />
        <span className="text-xs">{t('common:language')}</span>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px] px-3 py-2 bg-slate-800/50 border-slate-700 text-slate-200 hover:bg-slate-700/50 hover:border-slate-600"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentLanguage.flag}</span>
              <span className="font-medium">{currentLanguage.name}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" align="start">
          <Command className="bg-transparent">
            <CommandList className="dark:bg-slate-800">
              <CommandGroup>
                {LANGUAGES.map((language) => (
                  <CommandItem
                    key={language.code}
                    value={language.code}
                    onSelect={() => handleLanguageChange(language.code)}
                    className="flex items-center gap-2 px-2 py-3 dark:text-slate-200 dark:hover:bg-slate-700 dark:aria-selected:bg-slate-700 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 dark:text-slate-200",
                        i18n.language === language.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-lg">{language.flag}</span>
                    <span className="font-medium">{language.name}</span>
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

export default LanguageSelector;
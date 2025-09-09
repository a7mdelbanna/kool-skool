import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryCode {
  code: string;
  country: string;
  flag: string;
  dialCode: string;
}

const countryCodeData: CountryCode[] = [
  { code: "US", country: "United States", flag: "🇺🇸", dialCode: "+1" },
  { code: "GB", country: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
  { code: "CA", country: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { code: "AU", country: "Australia", flag: "🇦🇺", dialCode: "+61" },
  { code: "DE", country: "Germany", flag: "🇩🇪", dialCode: "+49" },
  { code: "FR", country: "France", flag: "🇫🇷", dialCode: "+33" },
  { code: "IT", country: "Italy", flag: "🇮🇹", dialCode: "+39" },
  { code: "ES", country: "Spain", flag: "🇪🇸", dialCode: "+34" },
  { code: "NL", country: "Netherlands", flag: "🇳🇱", dialCode: "+31" },
  { code: "BE", country: "Belgium", flag: "🇧🇪", dialCode: "+32" },
  { code: "CH", country: "Switzerland", flag: "🇨🇭", dialCode: "+41" },
  { code: "AT", country: "Austria", flag: "🇦🇹", dialCode: "+43" },
  { code: "SE", country: "Sweden", flag: "🇸🇪", dialCode: "+46" },
  { code: "NO", country: "Norway", flag: "🇳🇴", dialCode: "+47" },
  { code: "DK", country: "Denmark", flag: "🇩🇰", dialCode: "+45" },
  { code: "FI", country: "Finland", flag: "🇫🇮", dialCode: "+358" },
  { code: "JP", country: "Japan", flag: "🇯🇵", dialCode: "+81" },
  { code: "KR", country: "South Korea", flag: "🇰🇷", dialCode: "+82" },
  { code: "CN", country: "China", flag: "🇨🇳", dialCode: "+86" },
  { code: "IN", country: "India", flag: "🇮🇳", dialCode: "+91" },
  { code: "BR", country: "Brazil", flag: "🇧🇷", dialCode: "+55" },
  { code: "MX", country: "Mexico", flag: "🇲🇽", dialCode: "+52" },
  { code: "AR", country: "Argentina", flag: "🇦🇷", dialCode: "+54" },
  { code: "RU", country: "Russia", flag: "🇷🇺", dialCode: "+7" },
  { code: "TR", country: "Turkey", flag: "🇹🇷", dialCode: "+90" },
  { code: "EG", country: "Egypt", flag: "🇪🇬", dialCode: "+20" },
  { code: "ZA", country: "South Africa", flag: "🇿🇦", dialCode: "+27" },
  { code: "NG", country: "Nigeria", flag: "🇳🇬", dialCode: "+234" },
  { code: "KE", country: "Kenya", flag: "🇰🇪", dialCode: "+254" },
  { code: "MA", country: "Morocco", flag: "🇲🇦", dialCode: "+212" },
  { code: "DZ", country: "Algeria", flag: "🇩🇿", dialCode: "+213" },
  { code: "TN", country: "Tunisia", flag: "🇹🇳", dialCode: "+216" },
  { code: "LY", country: "Libya", flag: "🇱🇾", dialCode: "+218" },
  { code: "SD", country: "Sudan", flag: "🇸🇩", dialCode: "+249" },
  { code: "AE", country: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971" },
  { code: "SA", country: "Saudi Arabia", flag: "🇸🇦", dialCode: "+966" },
  { code: "QA", country: "Qatar", flag: "🇶🇦", dialCode: "+974" },
  { code: "KW", country: "Kuwait", flag: "🇰🇼", dialCode: "+965" },
  { code: "BH", country: "Bahrain", flag: "🇧🇭", dialCode: "+973" },
  { code: "OM", country: "Oman", flag: "🇴🇲", dialCode: "+968" },
  { code: "JO", country: "Jordan", flag: "🇯🇴", dialCode: "+962" },
  { code: "LB", country: "Lebanon", flag: "🇱🇧", dialCode: "+961" },
  { code: "SY", country: "Syria", flag: "🇸🇾", dialCode: "+963" },
  { code: "IQ", country: "Iraq", flag: "🇮🇶", dialCode: "+964" },
  { code: "IR", country: "Iran", flag: "🇮🇷", dialCode: "+98" },
  { code: "AF", country: "Afghanistan", flag: "🇦🇫", dialCode: "+93" },
  { code: "PK", country: "Pakistan", flag: "🇵🇰", dialCode: "+92" },
  { code: "BD", country: "Bangladesh", flag: "🇧🇩", dialCode: "+880" },
  { code: "LK", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94" },
  { code: "NP", country: "Nepal", flag: "🇳🇵", dialCode: "+977" },
  { code: "BT", country: "Bhutan", flag: "🇧🇹", dialCode: "+975" },
  { code: "MV", country: "Maldives", flag: "🇲🇻", dialCode: "+960" },
  { code: "TH", country: "Thailand", flag: "🇹🇭", dialCode: "+66" },
  { code: "VN", country: "Vietnam", flag: "🇻🇳", dialCode: "+84" },
  { code: "MY", country: "Malaysia", flag: "🇲🇾", dialCode: "+60" },
  { code: "SG", country: "Singapore", flag: "🇸🇬", dialCode: "+65" },
  { code: "ID", country: "Indonesia", flag: "🇮🇩", dialCode: "+62" },
  { code: "PH", country: "Philippines", flag: "🇵🇭", dialCode: "+63" },
  { code: "PT", country: "Portugal", flag: "🇵🇹", dialCode: "+351" },
];

interface CountryCodeSelectorProps {
  value: string;
  onSelect: (countryCode: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({
  value,
  onSelect,
  disabled = false,
  placeholder = "Select country code"
}) => {
  const [open, setOpen] = useState(false);

  const selectedCountry = useMemo(() => {
    return countryCodeData.find(country => country.dialCode === value);
  }, [value]);

  const handleSelect = (dialCode: string) => {
    onSelect(dialCode);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[140px] justify-between"
          disabled={disabled}
        >
          {selectedCountry ? (
            <div className="flex items-center gap-2">
              <span className="text-base">{selectedCountry.flag}</span>
              <span className="font-medium">{selectedCountry.dialCode}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countryCodeData.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.country} ${country.dialCode}`}
                  onSelect={() => handleSelect(country.dialCode)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-base">{country.flag}</span>
                    <div className="flex-1">
                      <div className="font-medium">{country.country}</div>
                      <div className="text-sm text-muted-foreground">{country.dialCode}</div>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === country.dialCode ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CountryCodeSelector;
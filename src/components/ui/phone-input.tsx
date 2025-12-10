import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string, countryCode: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
}

const COUNTRY_CODES = [
  { code: '+55', label: '🇧🇷 +55', country: 'Brasil' },
  { code: '+1', label: '🇺🇸 +1', country: 'EUA/Canadá' },
  { code: '+351', label: '🇵🇹 +351', country: 'Portugal' },
  { code: '+54', label: '🇦🇷 +54', country: 'Argentina' },
  { code: '+56', label: '🇨🇱 +56', country: 'Chile' },
  { code: '+57', label: '🇨🇴 +57', country: 'Colômbia' },
  { code: '+52', label: '🇲🇽 +52', country: 'México' },
  { code: '+34', label: '🇪🇸 +34', country: 'Espanha' },
  { code: '+44', label: '🇬🇧 +44', country: 'Reino Unido' },
];

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onChange, countryCode = '+55', onCountryCodeChange, ...props }, ref) => {
    const [localCountryCode, setLocalCountryCode] = React.useState(countryCode);

    const handleCountryCodeChange = (newCode: string) => {
      setLocalCountryCode(newCode);
      onCountryCodeChange?.(newCode);
      // Notifica mudança mantendo o valor atual
      onChange?.(value, newCode);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value, localCountryCode);
    };

    return (
      <div className="flex gap-2">
        <Select value={localCountryCode} onValueChange={handleCountryCodeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input
          ref={ref}
          className={cn("flex-1", className)}
          value={value}
          onChange={handleInputChange}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

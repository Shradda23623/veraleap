import { AMENITY_OPTIONS } from "@/lib/amenities";
import { Check } from "lucide-react";

interface AmenitiesSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

const AmenitiesSelector = ({ value, onChange, className = "" }: AmenitiesSelectorProps) => {
  const toggle = (a: string) => {
    if (value.includes(a)) {
      onChange(value.filter(v => v !== a));
    } else {
      onChange([...value, a]);
    }
  };

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${className}`}>
      {AMENITY_OPTIONS.map(a => {
        const active = value.includes(a);
        return (
          <button
            type="button"
            key={a}
            onClick={() => toggle(a)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:border-primary/40"
            }`}
          >
            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
              active ? "bg-primary border-primary text-primary-foreground" : "border-input"
            }`}>
              {active && <Check className="w-3 h-3" />}
            </span>
            <span className="truncate">{a}</span>
          </button>
        );
      })}
    </div>
  );
};

export default AmenitiesSelector;

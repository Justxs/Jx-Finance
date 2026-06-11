import GB from "country-flag-icons/react/3x2/GB";
import LT from "country-flag-icons/react/3x2/LT";
import { Button } from "@/components/ui/button";
import { type Locale, useLocale } from "@/stores/app-store";

const flags: Record<Locale, typeof GB> = { en: GB, lt: LT };
const labels: Record<Locale, string> = { en: "English", lt: "Lietuvių" };
const nextLocale: Record<Locale, Locale> = { en: "lt", lt: "en" };

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const Flag = flags[locale];

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setLocale(nextLocale[locale])}
      aria-label={labels[locale]}
      title={labels[locale]}
    >
      <Flag className="h-4 w-6 rounded-sm" />
    </Button>
  );
}

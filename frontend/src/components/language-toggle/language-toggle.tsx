import { Button } from "@/components/ui/button/button";
import { type Locale, useLocale } from "@/stores/app-store";

const labels: Record<Locale, string> = { en: "English", lt: "Lietuvių" };
const nextLocale: Record<Locale, Locale> = { en: "lt", lt: "en" };

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const next = nextLocale[locale];

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      lang={next}
      onClick={() => setLocale(next)}
      aria-label={`${locale.toUpperCase()}, ${labels[next]}`}
      tooltip={labels[next]}
    >
      <span aria-hidden="true" className="text-xs font-semibold tracking-wide uppercase">
        {locale}
      </span>
    </Button>
  );
}

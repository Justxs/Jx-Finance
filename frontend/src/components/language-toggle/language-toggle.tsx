import { Button } from "@/components/ui/button/button";
import { localeNames, nextLocale, useLocale } from "@/stores/app-store";

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
      aria-label={`${locale.toUpperCase()}, ${localeNames[next]}`}
      tooltip={localeNames[next]}
    >
      <span aria-hidden="true" className="text-xs font-semibold tracking-wide uppercase">
        {locale}
      </span>
    </Button>
  );
}

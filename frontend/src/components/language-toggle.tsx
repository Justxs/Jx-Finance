import { useLocale } from "../stores/app-store";

export const LanguageToggle = () => {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-white/70 p-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink">
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full px-3 py-1 transition ${
          locale === "en" ? "bg-ink text-white" : "text-ink/70 hover:text-ink"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("lt")}
        className={`rounded-full px-3 py-1 transition ${
          locale === "lt" ? "bg-ink text-white" : "text-ink/70 hover:text-ink"
        }`}
        aria-pressed={locale === "lt"}
      >
        LT
      </button>
    </div>
  );
};

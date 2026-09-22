import { useTranslation } from "react-i18next";
import { TitledSection } from "@/components/ui/section/section";
import { fonts, textSizes, useFont, useTextSize } from "@/stores/theme-store";

const optionClass =
  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 has-checked:border-input has-checked:bg-background has-checked:font-semibold has-checked:text-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ring";

const sampleSizes = { small: "text-xs", default: "text-base", large: "text-xl" };

export function FontPicker() {
  const { t } = useTranslation();
  const { font, setFont } = useFont();
  const { textSize, setTextSize } = useTextSize();

  return (
    <TitledSection title={t("typography.title")} description={t("typography.hint")}>
      <h3 id="font-picker-typeface" className="mt-4 text-sm font-medium">
        {t("typography.typeface")}
      </h3>
      <div
        role="radiogroup"
        aria-labelledby="font-picker-typeface"
        className="mt-2 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {fonts.map((option) => (
          <label key={option} data-font={option} className={`${optionClass} font-sans`}>
            <input
              type="radio"
              name="font"
              value={option}
              checked={font === option}
              onChange={() => setFont(option)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="shrink-0 font-serif text-xl leading-6 font-semibold"
            >
              Ag
            </span>
            <span className="min-w-0 truncate">{t(`typography.fonts.${option}`)}</span>
          </label>
        ))}
      </div>

      <h3 id="font-picker-size" className="mt-6 text-sm font-medium">
        {t("typography.textSize")}
      </h3>
      <div
        role="radiogroup"
        aria-labelledby="font-picker-size"
        className="mt-2 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {textSizes.map((option) => (
          <label key={option} className={optionClass}>
            <input
              type="radio"
              name="text-size"
              value={option}
              checked={textSize === option}
              onChange={() => setTextSize(option)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`w-5 shrink-0 text-center leading-6 font-semibold ${sampleSizes[option]}`}
            >
              A
            </span>
            <span className="min-w-0 truncate">{t(`typography.textSizes.${option}`)}</span>
          </label>
        ))}
      </div>
    </TitledSection>
  );
}

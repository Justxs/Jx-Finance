import { useTranslation } from "react-i18next";
import { Section, SectionTitle } from "@/components/ui/section";
import { palettes, usePalette } from "@/stores/theme-store";

export function PalettePicker() {
  const { t } = useTranslation();
  const { palette, setPalette } = usePalette();

  return (
    <Section aria-labelledby="palette-picker-title">
      <SectionTitle id="palette-picker-title">{t("appearance.title")}</SectionTitle>
      <p id="palette-picker-hint" className="mt-1 max-w-prose text-sm text-muted-foreground">
        {t("appearance.paletteHint")}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="palette-picker-title"
        aria-describedby="palette-picker-hint"
        className="mt-4 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {palettes.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 has-checked:border-input has-checked:bg-background has-checked:font-semibold has-checked:text-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name="palette"
              value={option}
              checked={palette === option}
              onChange={() => setPalette(option)}
              className="sr-only"
            />
            <span
              data-palette={option}
              aria-hidden="true"
              className="flex shrink-0 border border-border"
            >
              <span className="size-4 bg-sidebar" />
              <span className="size-4 bg-background" />
              <span className="size-4 bg-primary" />
            </span>
            <span className="min-w-0 truncate">{t(`appearance.palettes.${option}`)}</span>
          </label>
        ))}
      </div>
    </Section>
  );
}

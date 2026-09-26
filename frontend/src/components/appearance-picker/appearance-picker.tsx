import { type ComponentProps, type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { TitledSection } from "@/components/ui/section/section";
import { cn } from "@/lib/utils";
import { fonts, palettes, textSizes, useFont, usePalette, useTextSize } from "@/stores/theme-store";

const sampleSizes = { small: "text-xs", default: "text-base", large: "text-xl" };

interface ChoiceGroupProps<T extends string> extends Pick<
  ComponentProps<"div">,
  "aria-labelledby" | "aria-describedby" | "className"
> {
  name: string;
  heading?: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  optionLabel: (option: T) => string;
  renderSample: (option: T) => ReactNode;
  optionProps?: (option: T) => Record<`data-${string}`, string> & { className?: string };
}

function ChoiceGroup<T extends string>({
  name,
  heading,
  options,
  value,
  onChange,
  optionLabel,
  renderSample,
  optionProps,
  className,
  ...aria
}: Readonly<ChoiceGroupProps<T>>) {
  const headingId = useId();

  return (
    <div className={cn("mt-4", className)}>
      {heading ? (
        <h3 id={headingId} className="text-sm font-medium">
          {heading}
        </h3>
      ) : null}
      <div
        role="radiogroup"
        aria-labelledby={heading ? headingId : undefined}
        {...aria}
        className={cn("grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4", heading && "mt-2")}
      >
        {options.map((option) => {
          const props = optionProps?.(option);
          return (
            <label
              key={option}
              {...props}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 has-checked:border-input has-checked:bg-background has-checked:font-semibold has-checked:text-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ring",
                props?.className,
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {renderSample(option)}
              <span className="min-w-0 truncate">{optionLabel(option)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function AppearancePicker() {
  const { t } = useTranslation();
  const { palette, setPalette } = usePalette();
  const { font, setFont } = useFont();
  const { textSize, setTextSize } = useTextSize();

  return (
    <>
      <TitledSection
        titleId="appearance-title"
        title={t("appearance.title")}
        description={t("appearance.paletteHint")}
      >
        <ChoiceGroup
          name="palette"
          aria-labelledby="appearance-title"
          aria-describedby="appearance-title-description"
          options={palettes}
          value={palette}
          onChange={setPalette}
          optionLabel={(option) => t(`appearance.palettes.${option}`)}
          renderSample={(option) => (
            <span
              data-palette={option}
              aria-hidden="true"
              className="flex shrink-0 border border-border"
            >
              <span className="size-4 bg-sidebar" />
              <span className="size-4 bg-background" />
              <span className="size-4 bg-primary" />
            </span>
          )}
        />
      </TitledSection>
      <TitledSection title={t("typography.title")} description={t("typography.hint")}>
        <ChoiceGroup
          name="font"
          heading={t("typography.typeface")}
          options={fonts}
          value={font}
          onChange={setFont}
          optionLabel={(option) => t(`typography.fonts.${option}`)}
          optionProps={(option) => ({ "data-font": option, className: "font-sans" })}
          renderSample={() => (
            <span
              aria-hidden="true"
              className="shrink-0 font-serif text-xl leading-6 font-semibold"
            >
              Ag
            </span>
          )}
        />
        <ChoiceGroup
          name="text-size"
          heading={t("typography.textSize")}
          className="mt-6"
          options={textSizes}
          value={textSize}
          onChange={setTextSize}
          optionLabel={(option) => t(`typography.textSizes.${option}`)}
          renderSample={(option) => (
            <span
              aria-hidden="true"
              className={`w-5 shrink-0 text-center leading-6 font-semibold ${sampleSizes[option]}`}
            >
              A
            </span>
          )}
        />
      </TitledSection>
    </>
  );
}

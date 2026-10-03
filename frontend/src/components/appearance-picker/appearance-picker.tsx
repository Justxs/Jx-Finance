import { Eye, EyeOff, Moon, Receipt, Split, Sun } from "lucide-react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { TitledSection } from "@/components/ui/section/section";
import { useFeature, useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { localeNames, useLocale } from "@/stores/app-store";
import { useMyShare } from "@/stores/my-share-store";
import { locales, pageSizes, savePreferences, usePreferences } from "@/stores/preferences";
import { useAmountsHidden } from "@/stores/privacy-store";
import {
  fonts,
  palettes,
  textSizes,
  themes,
  useFont,
  usePalette,
  useTextSize,
  useTheme,
} from "@/stores/theme-store";

const sampleSizes = { small: "text-xs", default: "text-base", large: "text-xl" };

const amountStates = ["shown", "hidden"] as const;

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
  optionProps?: (
    option: T,
  ) => Record<`data-${string}`, string> & { className?: string; lang?: string };
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

const pageSizeOptions = ["default", ...pageSizes.map(String)] as const;

type PageSizeOption = (typeof pageSizeOptions)[number];

function PageSizeChoice() {
  const { t } = useTranslation();
  const { defaultPageSize } = useSettings();
  const chosen = usePreferences().pageSize;

  return (
    <TitledSection title={t("pageSize.title")} description={t("pageSize.hint")}>
      <ChoiceGroup<PageSizeOption>
        name="page-size"
        heading={t("pageSize.rows")}
        options={pageSizeOptions}
        value={chosen ? String(chosen) : "default"}
        onChange={(option) =>
          savePreferences({ pageSize: option === "default" ? undefined : pageSizeOf(option) })
        }
        optionLabel={(option) =>
          option === "default" ? t("pageSize.installation", { size: defaultPageSize }) : option
        }
        renderSample={() => null}
      />
    </TitledSection>
  );
}

function pageSizeOf(option: string) {
  return pageSizes.find((size) => String(size) === option);
}

const shareStates = ["full", "mine"] as const;

function MyShareChoice() {
  const { t } = useTranslation();
  const householdsEnabled = useFeature("households");
  const myShare = useMyShare();

  if (!householdsEnabled) {
    return null;
  }

  return (
    <TitledSection title={t("households.myShare.title")} description={t("households.myShare.hint")}>
      <ChoiceGroup
        name="my-share"
        heading={t("households.myShare.count")}
        options={shareStates}
        value={myShare ? "mine" : "full"}
        onChange={(option) => savePreferences({ myShare: option === "mine" })}
        optionLabel={(option) => t(`households.myShare.states.${option}`)}
        renderSample={(option) =>
          option === "mine" ? (
            <Split aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <Receipt aria-hidden="true" className="size-4 shrink-0" />
          )
        }
      />
    </TitledSection>
  );
}

export function AppearancePicker() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { palette, setPalette } = usePalette();
  const { font, setFont } = useFont();
  const { textSize, setTextSize } = useTextSize();
  const amountsHidden = useAmountsHidden();

  return (
    <>
      <TitledSection title={t("appearance.title")} description={t("appearance.hint")}>
        <ChoiceGroup
          name="theme"
          heading={t("appearance.theme")}
          options={themes}
          value={theme}
          onChange={setTheme}
          optionLabel={(option) => t(`appearance.themes.${option}`)}
          renderSample={(option) =>
            option === "dark" ? (
              <Moon aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <Sun aria-hidden="true" className="size-4 shrink-0" />
            )
          }
        />
        <ChoiceGroup
          name="palette"
          heading={t("appearance.palette")}
          className="mt-6"
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
        <ChoiceGroup
          name="language"
          heading={t("appearance.language")}
          className="mt-6"
          options={locales}
          value={locale}
          onChange={setLocale}
          optionLabel={(option) => localeNames[option]}
          optionProps={(option) => ({ lang: option })}
          renderSample={(option) => (
            <span aria-hidden="true" className="w-5 shrink-0 text-xs font-semibold uppercase">
              {option}
            </span>
          )}
        />
        <ChoiceGroup
          name="amounts"
          heading={t("appearance.amounts")}
          className="mt-6"
          options={amountStates}
          value={amountsHidden ? "hidden" : "shown"}
          onChange={(option) => savePreferences({ amountsHidden: option === "hidden" })}
          optionLabel={(option) => t(`appearance.amountsStates.${option}`)}
          renderSample={(option) =>
            option === "hidden" ? (
              <EyeOff aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <Eye aria-hidden="true" className="size-4 shrink-0" />
            )
          }
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
      <PageSizeChoice />
      <MyShareChoice />
    </>
  );
}

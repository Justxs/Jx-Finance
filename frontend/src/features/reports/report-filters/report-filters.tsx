import { useTranslation } from "react-i18next";
import type { ReportComparisonMode } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { Label } from "@/components/ui/label/label";
import { useTodayDate } from "@/hooks/use-settings";
import { detectPreset, presetRange, type ReportPreset } from "./date-range-presets";

interface Props {
  dateFrom: string;
  dateTo: string;
  comparison: ReportComparisonMode;
  onChange: (range: { dateFrom: string; dateTo: string }) => void;
  onComparisonChange: (comparison: ReportComparisonMode) => void;
}

const PRESETS: ReportPreset[] = ["thisMonth", "lastMonth", "thisYear", "lastYear", "custom"];

const COMPARISONS: ReportComparisonMode[] = ["none", "previousPeriod", "previousYear"];

export function ReportFilters({
  dateFrom,
  dateTo,
  comparison,
  onChange,
  onComparisonChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useTodayDate();
  const preset = detectPreset(dateFrom, dateTo, today);

  function handlePresetChange(next: ReportPreset) {
    if (next === "custom") {
      return;
    }
    onChange(presetRange(next, today));
  }

  return (
    <div
      role="group"
      aria-label={t("reports.range")}
      className="flex flex-wrap items-end gap-x-4 gap-y-3"
    >
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="report-preset">{t("reports.range")}</Label>
        <SelectField
          id="report-preset"
          className="sm:w-44"
          value={preset}
          onChange={handlePresetChange}
          options={PRESETS.map((p) => ({
            value: p,
            label: t(`reports.presets.${p}`),
            disabled: p === "custom",
          }))}
        />
      </div>

      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="report-range">{t("reports.customRange")}</Label>
        <DateRangePicker
          id="report-range"
          value={{ from: dateFrom, to: dateTo }}
          onChange={(range) => onChange({ dateFrom: range.from, dateTo: range.to })}
          className="sm:w-64"
        />
      </div>

      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="report-comparison">{t("reports.comparison.label")}</Label>
        <SelectField
          id="report-comparison"
          className="sm:w-52"
          value={comparison}
          onChange={onComparisonChange}
          options={COMPARISONS.map((mode) => ({
            value: mode,
            label: t(`reports.comparison.modes.${mode}`),
          }))}
        />
      </div>
    </div>
  );
}

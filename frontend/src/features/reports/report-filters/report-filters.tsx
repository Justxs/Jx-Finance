import { useTranslation } from "react-i18next";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/select-field";
import { detectPreset, presetRange, type ReportPreset } from "./date-range-presets";

interface Props {
  dateFrom: string;
  dateTo: string;
  onChange: (range: { dateFrom: string; dateTo: string }) => void;
}

const PRESETS: ReportPreset[] = ["thisMonth", "lastMonth", "thisYear", "lastYear", "custom"];

export function ReportFilters({ dateFrom, dateTo, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const preset = detectPreset(dateFrom, dateTo);

  function handlePresetChange(next: ReportPreset) {
    if (next === "custom") return;
    onChange(presetRange(next));
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="report-preset">{t("reports.range")}</Label>
        <SelectField
          id="report-preset"
          className="sm:w-44"
          value={preset}
          onChange={handlePresetChange}
          options={PRESETS.map((p) => ({ value: p, label: t(`reports.presets.${p}`) }))}
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
    </div>
  );
}

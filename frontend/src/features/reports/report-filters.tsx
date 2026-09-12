import { useTranslation } from "react-i18next";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

  function handlePresetChange(next: string) {
    if (next === "custom") return;
    onChange(presetRange(next as ReportPreset));
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="report-preset">{t("reports.range")}</Label>
        <Select
          id="report-preset"
          className="sm:w-44"
          value={preset}
          onChange={(e) => handlePresetChange(e.target.value)}
        >
          {PRESETS.map((p) => (
            <option key={p} value={p}>
              {t(`reports.presets.${p}`)}
            </option>
          ))}
        </Select>
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

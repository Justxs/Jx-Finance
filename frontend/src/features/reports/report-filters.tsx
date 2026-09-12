import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/ui/date-picker";
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
        <Label htmlFor="report-from">{t("reports.from")}</Label>
        <DatePicker
          id="report-from"
          value={dateFrom}
          onChange={(value) => onChange({ dateFrom: value, dateTo })}
          className="sm:w-40"
        />
      </div>

      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="report-to">{t("reports.to")}</Label>
        <DatePicker
          id="report-to"
          value={dateTo}
          onChange={(value) => onChange({ dateFrom, dateTo: value })}
          className="sm:w-40"
        />
      </div>
    </div>
  );
}

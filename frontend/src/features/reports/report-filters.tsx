import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
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
      <div className="space-y-1.5">
        <Label htmlFor="report-preset">{t("reports.range")}</Label>
        <Select
          id="report-preset"
          className="w-44"
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

      <div className="space-y-1.5">
        <Label htmlFor="report-from">{t("reports.from")}</Label>
        <Input
          id="report-from"
          type="date"
          value={dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value, dateTo })}
          className="w-40"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-to">{t("reports.to")}</Label>
        <Input
          id="report-to"
          type="date"
          value={dateTo}
          onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
          className="w-40"
        />
      </div>
    </div>
  );
}

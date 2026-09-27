import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MonthCloseMonthStatus } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { useDateFormat, useMonthName } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { monthDate, monthKeyOfIso, shiftMonth, yearOf } from "../month-key";

export const statusMarkers = {
  notEnded: { icon: Clock, tone: "text-muted-foreground" },
  open: { icon: CircleDashed, tone: "text-muted-foreground" },
  closed: { icon: CircleCheck, tone: "text-income" },
  closedChanged: { icon: CircleAlert, tone: "text-expense" },
} as const;

interface Props {
  month: string;
  months: readonly MonthCloseMonthStatus[];
  onChange: (month: string) => void;
}

export function MonthPicker({ month, months, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const monthName = useMonthName();
  const shortMonth = useDateFormat({ month: "short" });
  const current = monthKeyOfIso(useToday());
  const next = shiftMonth(month, 1);

  return (
    <nav aria-label={t("monthClose.picker.label")} className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("monthClose.picker.previous")}
          onClick={() => onChange(shiftMonth(month, -1))}
        >
          <ChevronLeft />
        </Button>
        <p
          className="min-w-44 text-center font-serif text-lg font-semibold lining-nums"
          aria-live="polite"
        >
          {monthName(month)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("monthClose.picker.next")}
          disabled={next > current}
          onClick={() => onChange(next)}
        >
          <ChevronRight />
        </Button>
      </div>

      <ol
        aria-label={t("monthClose.picker.year", { year: yearOf(month) })}
        className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12"
      >
        {months.map((entry) => {
          const key = monthKeyOfIso(entry.month);
          const marker = statusMarkers[entry.status];
          const Icon = marker.icon;
          const status = t(`monthClose.picker.status.${entry.status}`);
          const selected = key === month;

          return (
            <li key={key}>
              <button
                type="button"
                aria-current={selected ? "date" : undefined}
                disabled={key > current}
                title={`${monthName(key)}: ${status}`}
                onClick={() => onChange(key)}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 pointer-coarse:min-h-11",
                  selected ? "border-primary bg-primary/10 font-semibold" : "border-border",
                )}
              >
                <span className="capitalize">{shortMonth.format(monthDate(key))}</span>
                <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", marker.tone)} />
                <span className="sr-only">{status}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

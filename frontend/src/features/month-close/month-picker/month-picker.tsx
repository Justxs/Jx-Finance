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
  const selectedIndex = months.findIndex((entry) => monthKeyOfIso(entry.month) === month);

  return (
    <nav aria-label={t("monthClose.picker.label")} className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-xl font-semibold lining-nums" aria-live="polite">
          {monthName(month)}
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("monthClose.picker.previous")}
            onClick={() => onChange(shiftMonth(month, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("monthClose.picker.next")}
            disabled={next > current}
            onClick={() => onChange(next)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <ol
          aria-label={t("monthClose.picker.year", { year: yearOf(month) })}
          className="relative flex w-full min-w-max border-b"
        >
          {months.map((entry) => {
            const key = monthKeyOfIso(entry.month);
            const marker = statusMarkers[entry.status];
            const Icon = marker.icon;
            const status = t(`monthClose.picker.status.${entry.status}`);
            const selected = key === month;

            return (
              <li key={key} className="w-14 flex-1">
                <button
                  type="button"
                  aria-current={selected ? "date" : undefined}
                  disabled={key > current}
                  title={`${monthName(key)}: ${status}`}
                  onClick={() => onChange(key)}
                  className={cn(
                    "relative flex h-10 w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-all duration-200 ease-out-expo outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40 pointer-coarse:h-11",
                    selected && "font-semibold text-foreground",
                  )}
                >
                  <span className="capitalize">{shortMonth.format(monthDate(key))}</span>
                  <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", marker.tone)} />
                  <span className="sr-only">{status}</span>
                </button>
              </li>
            );
          })}
          {selectedIndex < 0 ? null : (
            <li
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-px left-(--month-offset) h-0.5 w-(--month-width) bg-foreground transition-all duration-300 ease-out-expo"
              style={{
                "--month-offset": `${(selectedIndex / months.length) * 100}%`,
                "--month-width": `${100 / months.length}%`,
              }}
            />
          )}
        </ol>
      </div>
    </nav>
  );
}

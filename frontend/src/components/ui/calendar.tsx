import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { type MonthView, gridDays, shiftMonth, toIso, weekdayLabels } from "@/lib/calendar";
import { cn } from "@/lib/utils";

interface Props {
  view: MonthView;
  onViewChange: (view: MonthView) => void;
  from?: string;
  to?: string;
  onPick: (iso: string) => void;
}

export function Calendar({ view, onViewChange, from, to, onPick }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const todayIso = toIso(new Date());
  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    year: "numeric",
  }).format(new Date(view.year, view.month, 1));

  return (
    <>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onViewChange(shiftMonth(view, -1))}
          aria-label={t("actions.previous")}
        >
          <ChevronLeft />
        </Button>
        <span className="text-sm font-medium capitalize">{monthLabel}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onViewChange(shiftMonth(view, 1))}
          aria-label={t("actions.next")}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-7">
        {weekdayLabels(i18n.language).map((label) => (
          <span
            key={label}
            className="flex h-8 items-center justify-center text-xs font-medium capitalize text-muted-foreground"
          >
            {label}
          </span>
        ))}
        {gridDays(view).map((day) => {
          const iso = toIso(day);
          const inMonth = day.getMonth() === view.month;
          const isStart = !!from && iso === from;
          const isEnd = !!to && iso === to;
          const isEdge = isStart || isEnd;
          const isBetween = !!from && !!to && iso > from && iso < to;
          const isToday = iso === todayIso;

          return (
            <button
              key={iso}
              type="button"
              aria-pressed={isEdge || isBetween}
              onClick={() => onPick(iso)}
              className={cn(
                "flex h-9 w-full items-center justify-center text-sm tabular-nums transition-colors",
                "rounded-md hover:bg-accent hover:text-accent-foreground",
                !inMonth && "text-muted-foreground/50",
                isToday && !isEdge && "font-semibold text-primary",
                isBetween && "rounded-none bg-accent text-accent-foreground",
                isStart && !!to && "rounded-r-none",
                isEnd && !!from && from !== to && "rounded-l-none",
                isEdge &&
                  "bg-primary font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </>
  );
}

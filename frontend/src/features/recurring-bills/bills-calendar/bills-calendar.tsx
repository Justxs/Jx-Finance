import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBillsCalendarSuspense } from "@/api/generated";
import type { BillOccurrence, RecurringBillResponse } from "@/api/generated/model";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SummaryStats, SummaryStatsSkeleton } from "@/components/summary-stats/summary-stats";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { BillChip } from "@/features/recurring-bills/bill-chip/bill-chip";
import { estimateNote } from "@/features/recurring-bills/recurring-totals/recurring-totals";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useDateFormat, useMonthName } from "@/hooks/use-formatters";
import { useToday, useWeekStartsOn } from "@/hooks/use-settings";
import { monthKeyOfIso, monthWeeks, parseIso, shiftMonth } from "@/lib/calendar";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

const MONTHS_AWAY = 12;

interface ChipActions {
  onConfirm: (bill: RecurringBillResponse) => void;
  onEdit: (bill: RecurringBillResponse) => void;
  onMarkDone: (occurrence: BillOccurrence) => void;
  markingDone?: string | null;
}

function Chips({
  occurrences,
  actions,
}: Readonly<{ occurrences: BillOccurrence[]; actions: ChipActions }>) {
  return (
    <ul className="space-y-1">
      {occurrences.map((occurrence) => (
        <li key={`${occurrence.billId}-${occurrence.date}`}>
          <BillChip occurrence={occurrence} {...actions} />
        </li>
      ))}
    </ul>
  );
}

function dayOf(iso: string) {
  return parseIso(iso) ?? new Date();
}

interface GridProps {
  month: string;
  byDate: ReadonlyMap<string, BillOccurrence[]>;
  actions: ChipActions;
}

function MonthTable({ month, byDate, actions }: Readonly<GridProps>) {
  const monthName = useMonthName();
  const today = useToday();
  const weeks = monthWeeks(month, useWeekStartsOn());
  const shortDay = useDateFormat({ weekday: "short" });
  const longDay = useDateFormat({ weekday: "long" });
  const fullDate = useDateFormat({ dateStyle: "full" });

  return (
    <table className="hidden w-full table-fixed border-collapse text-sm md:table">
      <caption className="sr-only">{monthName(month)}</caption>
      <thead>
        <tr>
          {(weeks[0] ?? []).map((iso) => (
            <th
              key={iso}
              scope="col"
              abbr={longDay.format(dayOf(iso))}
              className="h-9 px-2 text-left text-xs font-medium text-muted-foreground"
            >
              {shortDay.format(dayOf(iso))}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0]}>
            {week.map((iso) => {
              const inMonth = monthKeyOfIso(iso) === month;
              const isToday = iso === today;
              return (
                <td key={iso} className="h-24 border border-border p-1.5 align-top">
                  <time
                    dateTime={iso}
                    aria-current={isToday ? "date" : undefined}
                    className={cn(
                      "mb-1 inline-block rounded-sm px-1 text-xs tabular-nums",
                      inMonth ? "text-foreground" : "text-muted-foreground",
                      isToday && "bg-primary font-semibold text-primary-foreground",
                    )}
                  >
                    <span aria-hidden="true">{dayOf(iso).getDate()}</span>
                    <span className="sr-only">{fullDate.format(dayOf(iso))}</span>
                  </time>
                  {inMonth && byDate.has(iso) ? (
                    <Chips occurrences={byDate.get(iso) ?? []} actions={actions} />
                  ) : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Agenda({ byDate, actions }: Readonly<Omit<GridProps, "month">>) {
  const today = useToday();
  const dayName = useDateFormat({ weekday: "long", month: "long", day: "numeric" });

  return (
    <Rows className="md:hidden">
      {[...byDate.entries()].map(([iso, occurrences]) => (
        <li key={iso} className="space-y-1.5 py-2.5">
          <p
            className={cn(
              "text-xs font-medium text-muted-foreground first-letter:uppercase",
              iso === today && "text-foreground",
            )}
          >
            <time dateTime={iso}>{dayName.format(dayOf(iso))}</time>
          </p>
          <Chips occurrences={occurrences} actions={actions} />
        </li>
      ))}
    </Rows>
  );
}

function CalendarBody({ month, ...actions }: Readonly<ChipActions & { month: string }>) {
  const { t } = useTranslation();
  const calendar = useBillsCalendarSuspense({ month }).data;
  const byDate = new Map<string, BillOccurrence[]>();
  for (const occurrence of calendar.occurrences) {
    byDate.set(occurrence.date, [...(byDate.get(occurrence.date) ?? []), occurrence]);
  }

  return (
    <>
      <SummaryStats
        items={[
          {
            label: t("recurringBills.calendar.expectedOut"),
            value: calendar.expectedOut,
            lead: true,
            note: estimateNote(t, calendar.partial, calendar.unpriced),
          },
          {
            label: t("recurringBills.calendar.expectedIn"),
            value: calendar.expectedIn,
            sign: "+",
            tone: INCOME_TONE,
          },
          { label: t("recurringBills.calendar.paidOut"), value: calendar.paidOut },
        ]}
      />
      <Section>
        {calendar.occurrences.length === 0 ? (
          <EmptyText>{t("recurringBills.calendar.empty")}</EmptyText>
        ) : null}
        <MonthTable month={month} byDate={byDate} actions={actions} />
        <Agenda byDate={byDate} actions={actions} />
      </Section>
    </>
  );
}

export function BillsCalendarSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <SummaryStatsSkeleton />
      <Section>
        <Skeleton className="h-120 w-full" />
      </Section>
    </div>
  );
}

export function BillsCalendar(actions: Readonly<ChipActions>) {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/recurring-bills" });
  const search = useSearch({ from: "/recurring-bills" });
  const monthName = useMonthName();
  const current = monthKeyOfIso(useToday());
  const month = search.month ?? current;
  const [shown, stale] = useDeferredParams({ month });

  function choose(next: string) {
    void navigate({
      search: (previous) => ({ ...previous, month: next === current ? undefined : next }),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <SectionTitle aria-live="polite" className="first-letter:uppercase">
          {monthName(month)}
        </SectionTitle>
        <nav aria-label={t("recurringBills.calendar.calendar")} className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={month === current}
            onClick={() => choose(current)}
          >
            {t("recurringBills.calendar.today")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("recurringBills.calendar.previous")}
            disabled={month <= shiftMonth(current, -MONTHS_AWAY)}
            onClick={() => choose(shiftMonth(month, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("recurringBills.calendar.next")}
            disabled={month >= shiftMonth(current, MONTHS_AWAY)}
            onClick={() => choose(shiftMonth(month, 1))}
          >
            <ChevronRight />
          </Button>
        </nav>
      </div>
      <QueryBoundary
        fallback={<BillsCalendarSkeleton />}
        errorSubject={t("recurringBills.calendar.calendar")}
      >
        <StaleRegion stale={stale} className="space-y-5">
          <CalendarBody month={shown.month} {...actions} />
        </StaleRegion>
      </QueryBoundary>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import type { RecurringTotalsResponse } from "@/api/generated/model";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import type { Translate } from "@/lib/i18n";
import { INCOME_TONE } from "@/lib/tone";

export function estimateNote(t: Translate, partial: boolean, unpriced: number) {
  const notes = [
    partial ? t("recurringBills.calendar.partial") : null,
    unpriced > 0 ? t("recurringBills.calendar.unpriced", { count: unpriced }) : null,
  ].filter(Boolean);

  return notes.length > 0 ? (
    <span className="text-sm text-muted-foreground">{notes.join(" · ")}</span>
  ) : undefined;
}

export function RecurringTotals({ totals }: Readonly<{ totals: RecurringTotalsResponse }>) {
  const { t } = useTranslation();

  return (
    <SummaryStats
      items={[
        {
          label: t("recurringBills.totals.monthlyOut"),
          value: totals.monthlyOut,
          lead: true,
          note: estimateNote(t, totals.partial, totals.unpriced),
        },
        { label: t("recurringBills.totals.yearlyOut"), value: totals.yearlyOut },
        {
          label: t("recurringBills.totals.monthlyIn"),
          value: totals.monthlyIn,
          sign: "+",
          tone: INCOME_TONE,
        },
        {
          label: t("recurringBills.totals.yearlyIn"),
          value: totals.yearlyIn,
          sign: "+",
          tone: INCOME_TONE,
        },
      ]}
    />
  );
}

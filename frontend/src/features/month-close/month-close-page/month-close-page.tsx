import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMonthCloseYearSuspense, useMonthReviewSuspense } from "@/api/generated";
import type { MonthReviewResponse } from "@/api/generated/model";
import { PageHeader } from "@/components/page-header/page-header";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useDateTime, useMonthName } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { CloseChecklist } from "../close-checklist/close-checklist";
import { CloseForm } from "../close-form/close-form";
import { DriftPanel } from "../drift-panel/drift-panel";
import { MonthBudgets } from "../month-budgets/month-budgets";
import { MonthFigures } from "../month-figures/month-figures";
import { defaultMonth, latestEndedMonth, yearOf } from "../month-key";
import { MonthNetWorth } from "../month-net-worth/month-net-worth";
import { MonthPicker, statusMarkers } from "../month-picker/month-picker";

function MonthStatus({ review }: Readonly<{ review: MonthReviewResponse }>) {
  const { t } = useTranslation();
  const monthName = useMonthName();
  const dateTime = useDateTime();
  const Icon = statusMarkers[review.status].icon;

  return (
    <p
      role="status"
      className={cn(
        "flex max-w-prose items-start gap-2 text-sm",
        review.status === "closedChanged" ? "font-medium text-expense" : "text-muted-foreground",
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {t(`monthClose.status.${review.status}`, {
        month: monthName(review.month),
        date: dateTime(review.closedAt),
      })}
    </p>
  );
}

export function MonthClosePage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/close" });
  const search = useSearch({ from: "/close" });
  const today = useTodayDate();

  const year = yearOf(search.month ?? latestEndedMonth(today));
  const months = useMonthCloseYearSuspense({ year });
  const month = search.month ?? defaultMonth(today, months.data.months);

  const [shown, stale] = useDeferredParams({ month });
  const review = useMonthReviewSuspense(shown.month).data;
  const hasNetWorth = review.netWorthStart !== null || review.netWorthEnd !== null;

  function choose(next: string) {
    void navigate({ search: { month: next } });
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("monthClose.title")} description={t("monthClose.description")} />

      <MonthPicker month={month} months={months.data.months} onChange={choose} />

      <StaleRegion stale={stale} className="space-y-5">
        <MonthStatus review={review} />

        {review.status === "closedChanged" && review.drift ? (
          <DriftPanel drift={review.drift} figures={review.figures} />
        ) : null}

        <SplitColumns className="gap-x-5 gap-y-5 lg:items-start">
          <CloseChecklist month={shown.month} checklist={review.checklist} />
          <CloseForm
            key={`${shown.month}-${review.closedAt ?? ""}`}
            month={shown.month}
            review={review}
          />
        </SplitColumns>

        <MonthFigures month={shown.month} figures={review.figures} />

        {hasNetWorth || review.budgets ? (
          <SplitColumns className="gap-x-5 gap-y-5 lg:items-start">
            {hasNetWorth ? (
              <MonthNetWorth start={review.netWorthStart} end={review.netWorthEnd} />
            ) : null}
            {review.budgets ? <MonthBudgets budgets={review.budgets} /> : null}
          </SplitColumns>
        ) : null}
      </StaleRegion>
    </div>
  );
}

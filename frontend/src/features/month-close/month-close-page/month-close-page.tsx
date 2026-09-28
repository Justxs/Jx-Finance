import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMonthCloseYearSuspense, useMonthReviewSuspense } from "@/api/generated";
import { PageHeader } from "@/components/page-header/page-header";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useTodayDate } from "@/hooks/use-settings";
import { CloseForm } from "../close-form/close-form";
import { DriftPanel } from "../drift-panel/drift-panel";
import { MonthBudgets } from "../month-budgets/month-budgets";
import { MonthFigures, MonthMovers } from "../month-figures/month-figures";
import { defaultMonth, latestEndedMonth, yearOf } from "../month-key";
import { MonthPicker } from "../month-picker/month-picker";

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

  function choose(next: string) {
    void navigate({ search: { month: next } });
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("monthClose.title")} description={t("monthClose.description")} />

      <MonthPicker month={month} months={months.data.months} onChange={choose} />

      <StaleRegion stale={stale} className="space-y-5">
        <CloseForm
          key={`${shown.month}-${review.closedAt ?? ""}`}
          month={shown.month}
          review={review}
        />

        {review.status === "closedChanged" && review.drift ? (
          <DriftPanel drift={review.drift} figures={review.figures} />
        ) : null}

        <MonthFigures
          figures={review.figures}
          netWorthStart={review.netWorthStart}
          netWorthEnd={review.netWorthEnd}
        />

        <SplitColumns className="gap-x-5 gap-y-5 lg:items-start">
          <MonthMovers month={shown.month} figures={review.figures} />
          {review.budgets ? <MonthBudgets budgets={review.budgets} /> : null}
        </SplitColumns>
      </StaleRegion>
    </div>
  );
}

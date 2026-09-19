import { useNavigate, useSearch } from "@tanstack/react-router";
import { ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import { useGetReportSummaryEndpointSuspense } from "@/api/generated";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { PageHeader } from "@/components/page-header";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useFeature, useTodayDate } from "@/hooks/use-settings";
import { NetWorthChangeCard } from "../net-worth-change-card";
import { detectPreset, presetRange, ReportFilters } from "../report-filters";
import { ReportStats } from "../report-stats";
import { ReportTrendChart } from "../report-trend-chart";

export function ReportsPage() {
  const { t } = useTranslation();
  const netWorthEnabled = useFeature("netWorth");
  const navigate = useNavigate({ from: "/reports" });
  const { dateFrom: searchFrom, dateTo: searchTo } = useSearch({ from: "/reports" });

  const today = useTodayDate();
  const fallback = presetRange("thisMonth", today);
  const dateFrom = searchFrom ?? fallback.dateFrom;
  const dateTo = searchTo ?? fallback.dateTo;
  const preset = detectPreset(dateFrom, dateTo, today);

  const [shown, stale] = useDeferredParams({ dateFrom, dateTo });
  const summary = useGetReportSummaryEndpointSuspense(shown);

  function handleRangeChange(range: { dateFrom: string; dateTo: string }) {
    navigate({ search: () => range });
  }

  return (
    <div className="space-y-10">
      <PageHeader title={t("reports.title")} />

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onChange={handleRangeChange} />

      <ViewTransition name="report-results" enter="none" exit="none">
        <div className={`space-y-10 ${stale ? "is-stale" : ""}`} aria-busy={stale}>
          <ReportStats
            totalIncome={summary.data.totalIncome}
            totalExpense={summary.data.totalExpense}
            net={summary.data.net}
          />

          {netWorthEnabled && (preset === "thisYear" || preset === "lastYear") && (
            <NetWorthChangeCard dateFrom={dateFrom} dateTo={dateTo} />
          )}

          <div className="split-columns gap-y-10">
            <section className="section">
              <h2 className="section-title mb-4">{t("reports.expenseByCategory")}</h2>
              <CategoryBreakdown
                items={summary.data.expenseByCategory}
                dateFrom={shown.dateFrom}
                dateTo={shown.dateTo}
              />
            </section>
            <section className="section">
              <h2 className="section-title mb-4">{t("reports.trend")}</h2>
              <ReportTrendChart items={summary.data.trend} bucket={summary.data.trendBucket} />
            </section>
          </div>
        </div>
      </ViewTransition>
    </div>
  );
}

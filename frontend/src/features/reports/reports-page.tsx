import { ViewTransition } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useGetReportSummaryEndpointSuspense } from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { detectPreset, presetRange } from "./date-range-presets";
import { NetWorthChangeCard } from "./net-worth-change-card";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { ReportFilters } from "./report-filters";
import { ReportStats } from "./report-stats";
import { ReportTrendChart } from "./report-trend-chart";

export function ReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/reports" });
  const { dateFrom: searchFrom, dateTo: searchTo } = useSearch({ from: "/reports" });

  const fallback = presetRange("thisMonth");
  const dateFrom = searchFrom ?? fallback.dateFrom;
  const dateTo = searchTo ?? fallback.dateTo;
  const preset = detectPreset(dateFrom, dateTo);

  const [shown, stale] = useDeferredParams({ dateFrom, dateTo });
  const summary = useGetReportSummaryEndpointSuspense(shown);

  function handleRangeChange(range: { dateFrom: string; dateTo: string }) {
    navigate({ search: () => range });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("reports.title")} />

      <section className="card p-6">
        <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onChange={handleRangeChange} />
      </section>

      {summary.data ? (
        <ViewTransition name="report-results" enter="none" exit="none">
          <div className={`space-y-6 ${stale ? "is-stale" : ""}`} aria-busy={stale}>
            <ReportStats
              totalIncome={summary.data.totalIncome ?? "0"}
              totalExpense={summary.data.totalExpense ?? "0"}
              net={summary.data.net ?? "0"}
            />

            {(preset === "thisYear" || preset === "lastYear") && (
              <NetWorthChangeCard dateFrom={dateFrom} dateTo={dateTo} />
            )}

            <section className="card p-6">
              <h2 className="mb-4 font-semibold">{t("reports.trend")}</h2>
              <ReportTrendChart
                items={summary.data.trend ?? []}
                bucket={summary.data.trendBucket ?? "day"}
              />
            </section>

            <section className="card p-6">
              <h2 className="mb-4 font-semibold">{t("reports.expenseByCategory")}</h2>
              <CategoryBreakdown items={summary.data.expenseByCategory ?? []} />
            </section>
          </div>
        </ViewTransition>
      ) : null}
    </div>
  );
}

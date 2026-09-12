import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useGetReportSummaryEndpoint } from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
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

  const summary = useGetReportSummaryEndpoint({ dateFrom, dateTo });

  function handleRangeChange(range: { dateFrom: string; dateTo: string }) {
    navigate({ search: () => range });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("reports.title")} subtitle={t("reports.subtitle")} />

      <section className="card p-6">
        <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onChange={handleRangeChange} />
      </section>

      {summary.isPending ? <Skeleton className="h-32 w-full" /> : null}

      {summary.data ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}

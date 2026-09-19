import { useNavigate, useSearch } from "@tanstack/react-router";
import { ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import { useReportSummarySuspense } from "@/api/generated";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { ExportMenu } from "@/components/export-menu";
import { PageHeader } from "@/components/page-header";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useFeature, useTodayDate } from "@/hooks/use-settings";
import { buildExportUrl } from "@/lib/export-url";
import { NetWorthChangeCard } from "../net-worth-change-card";
import { detectPreset, ReportFilters } from "../report-filters";
import { reportRange } from "../report-queries";
import { ReportStats } from "../report-stats";
import { ReportTrendChart } from "../report-trend-chart";

export function ReportsPage() {
  const { t } = useTranslation();
  const netWorthEnabled = useFeature("netWorth");
  const navigate = useNavigate({ from: "/reports" });
  const search = useSearch({ from: "/reports" });

  const today = useTodayDate();
  const { dateFrom, dateTo } = reportRange(search, today);
  const preset = detectPreset(dateFrom, dateTo, today);

  const [shown, stale] = useDeferredParams({ dateFrom, dateTo });
  const summary = useReportSummarySuspense(shown);

  function handleRangeChange(range: { dateFrom: string; dateTo: string }) {
    navigate({ search: () => range });
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("reports.title")}>
        <ExportMenu
          csvUrl={buildExportUrl("/api/transactions/export", { dateFrom, dateTo })}
          pdfUrl={buildExportUrl("/api/transactions/export/pdf", { dateFrom, dateTo })}
        />
      </PageHeader>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onChange={handleRangeChange} />

      <ViewTransition name="report-results" enter="none" exit="none">
        <div className={`space-y-5 ${stale ? "is-stale" : ""}`} aria-busy={stale}>
          <ReportStats
            totalIncome={summary.data.totalIncome}
            totalExpense={summary.data.totalExpense}
            net={summary.data.net}
          />

          {netWorthEnabled && (preset === "thisYear" || preset === "lastYear") && (
            <NetWorthChangeCard dateFrom={dateFrom} dateTo={dateTo} />
          )}

          <div className="split-columns gap-y-5">
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

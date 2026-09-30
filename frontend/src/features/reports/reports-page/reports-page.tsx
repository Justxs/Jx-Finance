import { useNavigate, useSearch } from "@tanstack/react-router";
import { ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import {
  getExportTransactionsPdfUrl,
  getExportTransactionsUrl,
  useReportSummarySuspense,
} from "@/api/generated";
import type { ReportComparisonMode } from "@/api/generated/model";
import { CategoryBreakdown } from "@/components/category-breakdown/category-breakdown";
import { ExportMenu } from "@/components/export-menu/export-menu";
import { PageHeader } from "@/components/page-header/page-header";
import { TitledSection } from "@/components/ui/section/section";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { NetWorthChangeCard } from "@/features/reports/net-worth-change-card/net-worth-change-card";
import { PayeeBreakdown } from "@/features/reports/payee-breakdown/payee-breakdown";
import { detectPreset } from "@/features/reports/report-filters/date-range-presets";
import { ReportFilters } from "@/features/reports/report-filters/report-filters";
import { reportComparison, reportParams, reportRange } from "@/features/reports/report-queries";
import { ReportStats } from "@/features/reports/report-stats/report-stats";
import { ReportTrendChart } from "@/features/reports/report-trend-chart/report-trend-chart";
import { TagBreakdown } from "@/features/reports/tag-breakdown/tag-breakdown";
import { YearReview } from "@/features/reports/year-review/year-review";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useExportUrl } from "@/hooks/use-export-url";
import { useIsoDate } from "@/hooks/use-formatters";
import { useFeature, useTodayDate } from "@/hooks/use-settings";

export function ReportsPage() {
  const { t } = useTranslation();
  const netWorthEnabled = useFeature("netWorth");
  const navigate = useNavigate({ from: "/reports" });
  const search = useSearch({ from: "/reports" });
  const isoDate = useIsoDate();

  const today = useTodayDate();
  const { dateFrom, dateTo } = reportRange(search, today);
  const comparison = reportComparison(search);
  const preset = detectPreset(dateFrom, dateTo, today);
  const wholeYear = preset === "thisYear" || preset === "lastYear";

  const exportParams = { dateFrom, dateTo, page: 1, pageSize: 1 };
  const csvUrl = useExportUrl(getExportTransactionsUrl(exportParams));
  const pdfUrl = useExportUrl(getExportTransactionsPdfUrl(exportParams));

  const [shown, stale] = useDeferredParams(reportParams(search, today));
  const summary = useReportSummarySuspense(shown);
  const against = summary.data.comparison;

  function handleRangeChange(range: { dateFrom: string; dateTo: string }) {
    void navigate({ search: (previous) => ({ ...previous, ...range }) });
  }

  function handleComparisonChange(next: ReportComparisonMode) {
    void navigate({
      search: (previous) => ({ ...previous, comparison: next === "none" ? undefined : next }),
    });
  }

  const againstLabel = against
    ? t("reports.comparison.against", {
        from: isoDate(against.periodStart),
        to: isoDate(against.periodEnd),
      })
    : null;

  return (
    <div className="space-y-5">
      <PageHeader title={t("reports.title")}>
        <ExportMenu csvUrl={csvUrl} pdfUrl={pdfUrl} />
      </PageHeader>

      <ReportFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        preset={preset}
        comparison={comparison}
        onChange={handleRangeChange}
        onComparisonChange={handleComparisonChange}
      />

      <ViewTransition name="report-results" enter="none" exit="none">
        <StaleRegion stale={stale} className="space-y-5">
          {againstLabel ? <p className="text-sm text-muted-foreground">{againstLabel}</p> : null}

          <ReportStats
            totalIncome={summary.data.totalIncome}
            totalExpense={summary.data.totalExpense}
            net={summary.data.net}
            comparison={against}
          />

          {netWorthEnabled && wholeYear && (
            <NetWorthChangeCard dateFrom={dateFrom} dateTo={dateTo} />
          )}

          {wholeYear ? (
            <YearReview
              trend={summary.data.trend}
              expenseByCategory={summary.data.expenseByCategory}
              compared={comparison === "previousYear"}
              onCompare={() => handleComparisonChange("previousYear")}
            />
          ) : null}

          <SplitColumns className="gap-x-5 gap-y-5 lg:items-start">
            <div className="space-y-5">
              <TitledSection title={t("reports.expenseByCategory")} bodyGap="md">
                <CategoryBreakdown
                  items={summary.data.expenseByCategory}
                  dateFrom={shown.dateFrom}
                  dateTo={shown.dateTo}
                />
              </TitledSection>
              <TitledSection title={t("reports.incomeByCategory")} bodyGap="md">
                <CategoryBreakdown
                  items={summary.data.incomeByCategory}
                  type="income"
                  dateFrom={shown.dateFrom}
                  dateTo={shown.dateTo}
                />
              </TitledSection>
              <TitledSection title={t("tags.byTag")} bodyGap="md">
                <TagBreakdown
                  items={summary.data.expenseByTag}
                  dateFrom={shown.dateFrom}
                  dateTo={shown.dateTo}
                />
              </TitledSection>
              <TitledSection title={t("reports.expenseByPayee")} bodyGap="md">
                <PayeeBreakdown
                  items={summary.data.expenseByPayee}
                  dateFrom={shown.dateFrom}
                  dateTo={shown.dateTo}
                />
              </TitledSection>
            </div>
            <TitledSection title={t("reports.trend")} bodyGap="md">
              <ReportTrendChart items={summary.data.trend} bucket={summary.data.trendBucket} />
            </TitledSection>
          </SplitColumns>
        </StaleRegion>
      </ViewTransition>
    </div>
  );
}

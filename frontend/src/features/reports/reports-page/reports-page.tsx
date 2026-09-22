import { useNavigate, useSearch } from "@tanstack/react-router";
import { ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import { useReportSummarySuspense } from "@/api/generated";
import type { ReportComparisonMode } from "@/api/generated/model";
import { CategoryBreakdown } from "@/components/category-breakdown/category-breakdown";
import { ExportMenu } from "@/components/export-menu/export-menu";
import { PageHeader } from "@/components/page-header/page-header";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useExportUrl } from "@/hooks/use-export-url";
import { useIsoDate } from "@/hooks/use-formatters";
import { useFeature, useTodayDate } from "@/hooks/use-settings";
import { TRANSACTIONS_EXPORT_CSV_PATH, TRANSACTIONS_EXPORT_PDF_PATH } from "@/lib/export-url";
import { NetWorthChangeCard } from "../net-worth-change-card/net-worth-change-card";
import { detectPreset, ReportFilters } from "../report-filters";
import { reportComparison, reportParams, reportRange } from "../report-queries";
import { ReportStats } from "../report-stats/report-stats";
import { ReportTrendChart } from "../report-trend-chart/report-trend-chart";
import { TagBreakdown } from "../tag-breakdown/tag-breakdown";

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

  const csvUrl = useExportUrl(TRANSACTIONS_EXPORT_CSV_PATH, { dateFrom, dateTo });
  const pdfUrl = useExportUrl(TRANSACTIONS_EXPORT_PDF_PATH, { dateFrom, dateTo });

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

          {netWorthEnabled && (preset === "thisYear" || preset === "lastYear") && (
            <NetWorthChangeCard dateFrom={dateFrom} dateTo={dateTo} />
          )}

          <SplitColumns className="gap-y-5">
            <div className="space-y-5">
              <Section>
                <SectionTitle className="mb-4">{t("reports.expenseByCategory")}</SectionTitle>
                <CategoryBreakdown
                  items={summary.data.expenseByCategory}
                  dateFrom={shown.dateFrom}
                  dateTo={shown.dateTo}
                />
              </Section>
              <Section>
                <SectionTitle className="mb-4">{t("reports.incomeByCategory")}</SectionTitle>
                <CategoryBreakdown
                  items={summary.data.incomeByCategory}
                  type="income"
                  dateFrom={shown.dateFrom}
                  dateTo={shown.dateTo}
                />
              </Section>
              <Section>
                <SectionTitle className="mb-4">{t("tags.byTag")}</SectionTitle>
                <TagBreakdown
                  items={summary.data.expenseByTag}
                  dateFrom={shown.dateFrom}
                  dateTo={shown.dateTo}
                />
              </Section>
            </div>
            <Section>
              <SectionTitle className="mb-4">{t("reports.trend")}</SectionTitle>
              <ReportTrendChart items={summary.data.trend} bucket={summary.data.trendBucket} />
            </Section>
          </SplitColumns>
        </StaleRegion>
      </ViewTransition>
    </div>
  );
}

import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, FileUp } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAccountsSuspense,
  useMonthCloseYearSuspense,
  useMonthReviewSuspense,
} from "@/api/generated";
import type { MonthReviewResponse } from "@/api/generated/model";
import { PageHeader } from "@/components/page-header/page-header";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { Section, SectionTitle, TitledSection } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { ReconcileDialog } from "@/features/accounts/reconcile-dialog/reconcile-dialog";
import { ImportDialog } from "@/features/imports/import-dialog/import-dialog";
import {
  CloseChecklist,
  openLineCount,
} from "@/features/month-close/close-checklist/close-checklist";
import { CloseForm } from "@/features/month-close/close-form/close-form";
import { DriftPanel } from "@/features/month-close/drift-panel/drift-panel";
import {
  isClosedStatus,
  monthTitleKey,
  statusMarkers,
  useStatusLine,
} from "@/features/month-close/status-markers";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useMonthName } from "@/hooks/use-formatters";
import { useFeature, useTodayDate } from "@/hooks/use-settings";
import { currentMonthKey, latestEndedMonth, shiftMonth } from "@/lib/calendar";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { BillsDueLines } from "./bills-due-lines";
import { MonthBodySkeleton } from "./month-page-pending";
import { defaultMonth, latestYearParams } from "./month-queries";
import { UncategorizedLines } from "./uncategorized-lines";
import { useLineKeys } from "./use-line-keys";

const MONTH_STEP_WAIT = 300;

interface StepperProps {
  month: string;
  current: string;
  onChange: (month: string) => void;
}

function MonthStepper({ month, current, onChange }: Readonly<StepperProps>) {
  const { t } = useTranslation();
  const monthName = useMonthName();
  const next = shiftMonth(month, 1);

  return (
    <nav aria-label={t("dashboard.month.label")} className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("dashboard.month.previous")}
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <span
        aria-live="polite"
        className="inline-block min-w-32 text-center text-sm font-medium tabular-nums first-letter:uppercase"
      >
        {monthName(month)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("dashboard.month.next")}
        disabled={next > current}
        onClick={() => onChange(next)}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}

interface StatusProps {
  month: string;
  review: MonthReviewResponse;
  onImport?: () => void;
}

function MonthStatus({ month, review, onImport }: Readonly<StatusProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const monthName = useMonthName()(month);
  const statusLine = useStatusLine();
  const lines = openLineCount(review.checklist);
  const marker = statusMarkers[review.status];

  return (
    <Section aria-labelledby={titleId} className="flex flex-wrap items-start gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
        <marker.icon aria-hidden="true" className={cn("mt-1 size-5 shrink-0", marker.tone)} />
        <div className="min-w-0">
          <SectionTitle id={titleId}>
            {t(`monthClose.panel.title.${monthTitleKey(review.status, lines)}`, {
              month: monthName,
            })}
          </SectionTitle>
          <p
            role="status"
            className={cn(
              "mt-0.5 text-sm",
              review.status === "closedChanged"
                ? ["font-medium", EXPENSE_TONE]
                : "text-muted-foreground",
            )}
          >
            {statusLine(review)}
          </p>
        </div>
      </div>
      {onImport ? (
        <Button type="button" variant="outline" className="ml-auto" onClick={onImport}>
          <FileUp />
          {t("monthClose.page.importStatement")}
        </Button>
      ) : null}
    </Section>
  );
}

interface ImportTarget {
  accountId?: string;
}

function MonthBody({ month }: Readonly<{ month: string }>) {
  const { t } = useTranslation();
  const review = useMonthReviewSuspense(month).data;
  const accounts = useAccountsSuspense().data;
  const importEnabled = useFeature("import");
  const lines = useRef<HTMLDivElement>(null);
  const [importing, setImporting] = useState<ImportTarget | null>(null);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const closed = isClosedStatus(review.status);
  const { checklist } = review;
  useLineKeys(lines);

  return (
    <>
      <MonthStatus
        month={month}
        review={review}
        onImport={importEnabled && !closed ? () => setImporting({}) : undefined}
      />

      {closed ? null : (
        <div ref={lines} className="space-y-5">
          {checklist.accounts.length > 0 ? (
            <TitledSection title={t("monthClose.page.statements")} bodyGap="sm">
              <CloseChecklist
                month={month}
                checklist={checklist}
                kinds={["accounts"]}
                onImport={(accountId) => setImporting({ accountId })}
                onReconcile={setReconcileId}
              />
            </TitledSection>
          ) : null}
          <UncategorizedLines month={month} count={checklist.uncategorized} />
          {checklist.unconfirmedRecurring === null ? null : (
            <BillsDueLines
              monthEnd={review.monthEnd}
              accounts={accounts}
              count={checklist.unconfirmedRecurring}
            />
          )}
          <TitledSection title={t("monthClose.page.review")} bodyGap="sm">
            <CloseChecklist month={month} checklist={checklist} kinds={["unusual", "duplicates"]} />
          </TitledSection>
        </div>
      )}

      <CloseForm key={`${month}-${review.closedAt ?? ""}`} month={month} review={review} />

      {review.status === "closedChanged" && review.drift ? (
        <DriftPanel drift={review.drift} figures={review.figures} />
      ) : null}

      {importEnabled ? (
        <ImportDialog
          open={importing !== null}
          onOpenChange={(open) => {
            if (!open) {
              setImporting(null);
            }
          }}
          accounts={accounts}
          initialAccountId={importing?.accountId}
        />
      ) : null}
      <ReconcileDialog
        account={accounts.find((account) => account.id === reconcileId) ?? null}
        onClose={() => setReconcileId(null)}
      />
    </>
  );
}

function MonthView({ month }: Readonly<{ month: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/reports/month" });
  const current = currentMonthKey(useTodayDate());
  const [shown, stale] = useDeferredParams({ month });
  const stepped = useDebouncedDraft(
    month,
    (next) => void navigate({ search: { month: next } }),
    MONTH_STEP_WAIT,
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("nav.monthClose")}>
        <MonthStepper month={stepped.draft} current={current} onChange={stepped.change} />
      </PageHeader>
      <StaleRegion stale={stale} className="space-y-5">
        <QueryBoundary fallback={<MonthBodySkeleton />} errorSubject={t("monthClose.title")}>
          <MonthBody month={shown.month} />
        </QueryBoundary>
      </StaleRegion>
    </div>
  );
}

function LatestMonthView() {
  const latest = latestEndedMonth(useTodayDate());
  const year = useMonthCloseYearSuspense(latestYearParams(latest)).data;
  return <MonthView month={defaultMonth(year.months, latest)} />;
}

export function MonthPage() {
  const month = useSearch({ strict: false, select: (search) => search.month });
  return month ? <MonthView month={month} /> : <LatestMonthView />;
}

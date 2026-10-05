import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { ReconciliationResponse } from "@/api/generated/model";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useIsoDate, useMoney, useMonthName } from "@/hooks/use-formatters";
import { useFeature, useTodayDate } from "@/hooks/use-settings";
import { currentMonthKey, monthKeyOfIso } from "@/lib/calendar";
import { toCents } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface ImportResult {
  imported: number;
  linked: number;
  skipped: number;
  uncategorized: number;
  accountId: string;
  dateFrom: string;
  dateTo: string;
  reconciliation?: ReconciliationResponse | null;
}

function useReconciliationText() {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();

  return (reconciliation: ReconciliationResponse) =>
    toCents(reconciliation.difference) === 0
      ? t("imports.resultReconciled", { date: formatDate(reconciliation.date) })
      : t("imports.resultDiffers", {
          date: formatDate(reconciliation.date),
          difference: money.format(
            Math.abs(Number(reconciliation.difference)),
            reconciliation.currency,
          ),
        });
}

function useImportCountsText() {
  const { t } = useTranslation();

  return ({ imported, linked, skipped }: Pick<ImportResult, "imported" | "linked" | "skipped">) =>
    [
      imported > 0 ? t("imports.resultImported", { count: imported }) : "",
      linked > 0 ? t("imports.resultLinked", { count: linked }) : "",
      skipped > 0 ? t("imports.resultSkipped", { count: skipped }) : "",
    ]
      .filter(Boolean)
      .join(" ");
}

interface Props {
  result: ImportResult;
  onLeave?: () => void;
  onImportAnother: () => void;
}

export function ImportResultPanel({ result, onLeave, onImportAnother }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const monthName = useMonthName();
  const countsText = useImportCountsText();
  const reconciliationText = useReconciliationText();
  const monthCloseOn = useFeature("monthClose");
  const currentMonth = currentMonthKey(useTodayDate());
  const { reconciliation } = result;
  const month = monthKeyOfIso(reconciliation?.date ?? result.dateTo);
  const range = {
    page: 1,
    accountId: result.accountId,
    dateFrom: result.dateFrom,
    dateTo: result.dateTo,
  };
  const categorize = result.uncategorized > 0;
  const matches = reconciliation ? toCents(reconciliation.difference) === 0 : false;

  return (
    <Section className="space-y-4" aria-labelledby="import-result-title">
      <div className="space-y-1">
        <SectionTitle id="import-result-title" ref={(node) => node?.focus()} tabIndex={-1}>
          {t("imports.resultTitle")}
        </SectionTitle>
        <p role="status" className="text-sm tabular-nums">
          {countsText(result)}
        </p>
      </div>

      {reconciliation ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t pt-3 text-sm">
          <p
            className={cn(
              "tabular-nums",
              matches ? "text-muted-foreground" : "font-medium text-expense",
            )}
          >
            {reconciliationText(reconciliation)}
          </p>
          <p className="flex items-baseline gap-3">
            <span className="text-muted-foreground">{t("imports.resultClosingBalance")}</span>
            <span className="border-b-3 border-double border-rule pb-0.5 text-base font-semibold whitespace-nowrap tabular-nums">
              {money.format(Number(reconciliation.balance), reconciliation.currency)}
            </span>
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {categorize ? (
          <Link
            to="/transactions"
            search={{ ...range, uncategorized: true }}
            className={buttonVariants()}
            onClick={onLeave}
          >
            {t("imports.resultCategorize", { count: result.uncategorized })}
          </Link>
        ) : null}
        {result.imported + result.linked > 0 ? (
          <Link
            to="/transactions"
            search={range}
            className={buttonVariants({ variant: categorize ? "outline" : "default" })}
            onClick={onLeave}
          >
            {t("imports.resultLink")}
          </Link>
        ) : null}
        {monthCloseOn && month < currentMonth ? (
          <Link
            to="/reports/month"
            search={{ month }}
            className={buttonVariants({ variant: "outline" })}
            onClick={onLeave}
          >
            {t("imports.resultMonthClose", { month: monthName(month) })}
          </Link>
        ) : null}
        <Button variant="link-muted" size="inline" onClick={onImportAnother}>
          {t("imports.importAnother")}
        </Button>
      </div>
    </Section>
  );
}

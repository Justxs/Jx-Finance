import { useTranslation } from "react-i18next";
import type { ReconciliationResponse } from "@/api/generated/model";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { toCents } from "@/lib/money";

export interface ImportResult {
  imported: number;
  linked: number;
  skipped: number;
  accountId: string;
  dateFrom: string;
  dateTo: string;
  reconciliation?: ReconciliationResponse | null;
}

export function useReconciliationText() {
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

export function ImportResultLine({ result }: Readonly<{ result: ImportResult }>) {
  const { t } = useTranslation();
  const reconciliationText = useReconciliationText();

  return (
    <p role="status" className="text-sm text-foreground">
      <span className="tabular-nums">
        {t("imports.resultImported", { count: result.imported })}
        {result.linked > 0 ? ` ${t("imports.resultLinked", { count: result.linked })}` : ""}
        {result.skipped > 0 ? ` ${t("imports.resultSkipped", { count: result.skipped })}` : ""}
      </span>{" "}
      {result.imported + result.linked > 0 ? (
        <TextLink
          to="/transactions"
          search={{
            page: 1,
            accountId: result.accountId,
            dateFrom: result.dateFrom,
            dateTo: result.dateTo,
          }}
        >
          {t("imports.resultLink")}
        </TextLink>
      ) : null}
      {result.reconciliation ? (
        <span
          className={
            toCents(result.reconciliation.difference) === 0
              ? "block text-muted-foreground tabular-nums"
              : "block font-medium text-expense tabular-nums"
          }
        >
          {reconciliationText(result.reconciliation)}
        </span>
      ) : null}
    </p>
  );
}

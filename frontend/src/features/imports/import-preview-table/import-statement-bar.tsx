import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  ImportStatementSummary,
  StatementFormat,
} from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { toCents } from "@/lib/money";
import { type PreviewRowState, summarizeSelection } from "./preview-rows";

interface Props {
  statement: ImportStatementSummary;
  format: StatementFormat;
  rows: PreviewRowState[];
  accounts: AccountResponse[];
  onSwitchAccount: (accountId: string) => void;
  disabled?: boolean;
}

export function ImportStatementBar({
  statement,
  format,
  rows,
  accounts,
  onSwitchAccount,
  disabled = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const currency = statement.closingCurrency ?? undefined;
  const other = accounts.find((account) => account.id === statement.otherAccountId);
  const net =
    summarizeSelection(
      rows.filter((row) => !row.existingTransferId && !row.existingTransactionId),
    ).nets.find((item) => item.currency === currency)?.cents ?? 0;
  const ledger =
    statement.ledgerBalanceAtClose === null ? null : toCents(statement.ledgerBalanceAtClose) + net;
  const difference =
    statement.closingBalance === null || ledger === null
      ? null
      : toCents(statement.closingBalance) - ledger;

  if (
    !statement.iban &&
    !statement.closingBalance &&
    !statement.notBooked &&
    !statement.unreadable
  ) {
    return null;
  }

  return (
    <div className="space-y-1 border-b pb-3 text-sm">
      {statement.iban ? (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span>{t("imports.statement.iban", { iban: statement.iban })}</span>
          {statement.ibanMatchesAccount ? null : (
            <span role="alert" className="font-medium text-expense">
              {t("imports.statement.otherIban")}
            </span>
          )}
          {other ? (
            <Button
              variant="link"
              size="inline"
              disabled={disabled}
              onClick={() => onSwitchAccount(other.id)}
            >
              {t("imports.statement.switch", { account: other.name })}
            </Button>
          ) : null}
        </p>
      ) : null}
      {statement.notBooked > 0 ? (
        <p className="text-muted-foreground">
          {t(
            format === "genericCsv" ? "imports.statement.skipped" : "imports.statement.notBooked",
            { count: statement.notBooked },
          )}
        </p>
      ) : null}
      {statement.unreadable > 0 ? (
        <p className="font-medium text-expense">
          {t("imports.statement.unreadable", { count: statement.unreadable })}
        </p>
      ) : null}
      {statement.closingBalance ? (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums" role="status">
          <span>
            {t("imports.statement.closing", {
              date: formatDate(statement.closingDate),
              amount: money.format(Number(statement.closingBalance), currency),
            })}
          </span>
          {ledger === null || difference === null ? null : (
            <span
              className={difference === 0 ? "text-muted-foreground" : "font-medium text-expense"}
            >
              {difference === 0
                ? t("imports.statement.agrees", {
                    ledger: money.format(ledger / 100, currency),
                  })
                : t("imports.statement.differs", {
                    ledger: money.format(ledger / 100, currency),
                    difference: money.formatSigned(difference / 100, "auto", currency),
                  })}
            </span>
          )}
        </p>
      ) : null}
    </div>
  );
}

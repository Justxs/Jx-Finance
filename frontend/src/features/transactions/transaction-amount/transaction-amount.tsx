import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { ApproximateAmount } from "@/components/approximate-amount/approximate-amount";
import { Tag } from "@/components/ui/tag/tag";
import { useReportingCurrency } from "@/hooks/use-currencies";
import { useMoney } from "@/hooks/use-formatters";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { isOptimistic, isRefund } from "./transaction-row";

type Transaction = Pick<TransactionResponse, "amount" | "type" | "currency">;

export function signedAmount(money: ReturnType<typeof useMoney>, transaction: Transaction) {
  return money.formatSigned(
    Number(transaction.amount),
    transaction.type === "income" || isRefund(transaction) ? "+" : "−",
    transaction.currency,
  );
}

interface Props {
  transaction: TransactionResponse;
  showReporting?: boolean;
  className?: string;
}

export function TransactionAmount({
  transaction,
  showReporting = false,
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const reportingCurrency = useReportingCurrency();
  const isIncome = transaction.type === "income";
  const reportingVisible =
    showReporting && transaction.currency !== reportingCurrency && !isOptimistic(transaction);

  return (
    <span
      className={cn(
        "font-semibold whitespace-nowrap tabular-nums",
        isIncome ? INCOME_TONE : "text-foreground",
        className,
      )}
    >
      {isRefund(transaction) ? (
        <Tag className="mr-1.5 align-text-bottom">{t("transactions.refund")}</Tag>
      ) : null}
      {signedAmount(money, transaction)}
      {reportingVisible ? (
        <ApproximateAmount
          value={Number(transaction.reportingAmount)}
          currency={reportingCurrency}
        />
      ) : null}
    </span>
  );
}

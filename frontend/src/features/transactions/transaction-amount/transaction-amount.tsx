import type { TransactionResponse } from "@/api/generated/model";
import { ApproximateAmount } from "@/components/approximate-amount/approximate-amount";
import { useMoney, useReportingCurrency } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";
import { isOptimistic } from "./transaction-row";

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
  const money = useMoney();
  const reportingCurrency = useReportingCurrency();
  const isIncome = transaction.type === "income";
  const reportingVisible =
    showReporting && transaction.currency !== reportingCurrency && !isOptimistic(transaction);

  return (
    <span
      className={cn(
        "font-semibold whitespace-nowrap tabular-nums",
        isIncome ? "text-income" : "text-foreground",
        className,
      )}
    >
      {money.formatSigned(Number(transaction.amount), isIncome ? "+" : "−", transaction.currency)}
      {reportingVisible ? (
        <ApproximateAmount
          value={Number(transaction.reportingAmount)}
          currency={reportingCurrency}
        />
      ) : null}
    </span>
  );
}

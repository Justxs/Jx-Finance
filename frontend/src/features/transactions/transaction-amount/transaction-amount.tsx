import type { TransactionResponse } from "@/api/generated/model";
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
      {isIncome ? "+" : "−"}
      {money.format(Number(transaction.amount), transaction.currency)}
      {reportingVisible ? (
        <span className="block text-xs font-normal text-muted-foreground">
          ≈ {money.format(Number(transaction.reportingAmount))}
        </span>
      ) : null}
    </span>
  );
}

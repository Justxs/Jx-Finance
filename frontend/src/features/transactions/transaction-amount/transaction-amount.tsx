import type { TransactionResponse } from "@/api/generated/model";
import { ApproximateAmount } from "@/components/approximate-amount/approximate-amount";
import { useMoney, useReportingCurrency } from "@/hooks/use-formatters";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { isOptimistic } from "./transaction-row";

type Transaction = Pick<TransactionResponse, "amount" | "type" | "currency">;

export function signedAmount(money: ReturnType<typeof useMoney>, transaction: Transaction) {
  return money.formatSigned(
    Number(transaction.amount),
    transaction.type === "income" ? "+" : "−",
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

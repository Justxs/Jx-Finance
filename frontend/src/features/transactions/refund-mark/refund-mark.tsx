import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { buttonVariants } from "@/components/ui/button/button";
import { HintTag } from "@/components/ui/tag/tag";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { EMPTY_VALUE, useIsoDate, useMoney, useReportingCurrency } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

interface Props {
  transaction: Pick<TransactionResponse, "refundOf" | "refundedAmount">;
  className?: string;
}

export function RefundMark({ transaction, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const reportingCurrency = useReportingCurrency();
  const formatDate = useIsoDate();
  const original = transaction.refundOf;

  if (original) {
    return (
      <Tooltip content={t("transactions.refundOfShow")}>
        <Link
          to="/transactions"
          search={{
            page: 1,
            search: original.description ?? undefined,
            dateFrom: original.date,
            dateTo: original.date,
          }}
          className={cn(
            buttonVariants({ variant: "link-muted", size: "inline" }),
            "text-left text-xs",
            className,
          )}
        >
          {t("transactions.refundOf", {
            description: original.description || EMPTY_VALUE,
            date: formatDate(original.date),
          })}
        </Link>
      </Tooltip>
    );
  }

  if (!transaction.refundedAmount) {
    return null;
  }

  const amount = money.format(Number(transaction.refundedAmount), reportingCurrency);
  return (
    <span className={cn("inline-flex", className)}>
      <HintTag hint={t("transactions.refundedHint", { amount })}>
        {t("transactions.refunded", { amount })}
      </HintTag>
    </span>
  );
}

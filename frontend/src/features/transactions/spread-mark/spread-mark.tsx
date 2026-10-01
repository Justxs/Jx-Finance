import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { HintTag } from "@/components/ui/tag/tag";
import { useMoney, useMonthName } from "@/hooks/use-formatters";
import {
  spreadFrom,
  spreadMonthly,
  spreadPartWithin,
  spreadSlices,
  spreadUntil,
} from "@/lib/spread-slices";
import { cn } from "@/lib/utils";

interface Props {
  transaction: Pick<
    TransactionResponse,
    "date" | "reportingAmount" | "spreadMonths" | "spreadDirection"
  >;
  className?: string;
}

export function SpreadMark({ transaction, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const monthName = useMonthName();
  const { dateFrom, dateTo } = useSearch({ strict: false });
  const months = transaction.spreadMonths;
  const direction = transaction.spreadDirection ?? "forward";

  if (!months) {
    return null;
  }

  const values = {
    amount: money.format(Number(spreadMonthly(transaction.reportingAmount, months))),
    from: monthName(spreadFrom(transaction.date, months, direction)),
    to: monthName(spreadUntil(transaction.date, months, direction)),
  };
  const hint =
    dateFrom && dateTo
      ? t("transactions.spread.tooltipInRange", {
          ...values,
          part: money.format(
            Number(
              spreadPartWithin(
                spreadSlices(transaction.date, transaction.reportingAmount, months, direction),
                dateFrom,
                dateTo,
              ),
            ),
          ),
        })
      : t("transactions.spread.tooltip", values);

  return (
    <span className={cn("inline-flex", className)}>
      <HintTag hint={hint}>{t("transactions.spread.chip", { months })}</HintTag>
    </span>
  );
}

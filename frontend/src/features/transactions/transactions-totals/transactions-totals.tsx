import { useTranslation } from "react-i18next";
import { useGetTransactionsSummarySuspense } from "@/api/generated";
import type { GetTransactionsSummaryParams } from "@/api/generated/model";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

interface LineProps {
  count: number;
  totalIncome: string;
  totalExpense: string;
  stale?: boolean;
}

export function TransactionsTotalsLine({
  count,
  totalIncome,
  totalExpense,
  stale = false,
}: Readonly<LineProps>) {
  const { t } = useTranslation();
  const money = useMoney();

  return (
    <p
      aria-label={t("transactions.totalsLabel")}
      aria-busy={stale}
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground tabular-nums sm:gap-x-2",
        stale && "is-stale",
      )}
    >
      <span className="whitespace-nowrap">{t("transactions.count", { count })}</span>
      <span aria-hidden="true" className="hidden sm:inline">
        ·
      </span>
      <span className="whitespace-nowrap">
        <span className="font-semibold text-income">+{money.format(Number(totalIncome))}</span>{" "}
        {t("transactions.totalIncome")}
      </span>
      <span aria-hidden="true" className="hidden sm:inline">
        ·
      </span>
      <span className="whitespace-nowrap">
        <span className="font-semibold text-foreground">−{money.format(Number(totalExpense))}</span>{" "}
        {t("transactions.totalExpense")}
      </span>
    </p>
  );
}

interface Props {
  params: GetTransactionsSummaryParams;
  stale: boolean;
}

function LoadedTotals({ params, stale }: Readonly<Props>) {
  const summary = useGetTransactionsSummarySuspense(params);

  return (
    <TransactionsTotalsLine
      count={summary.data.count}
      totalIncome={summary.data.totalIncome}
      totalExpense={summary.data.totalExpense}
      stale={stale}
    />
  );
}

export function TransactionsTotals({ params, stale }: Readonly<Props>) {
  return (
    <QueryBoundary
      fallback={
        <div className="flex min-h-9 items-center">
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      }
      errorClassName="py-2"
    >
      <LoadedTotals params={params} stale={stale} />
    </QueryBoundary>
  );
}

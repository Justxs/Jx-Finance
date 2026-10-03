import { useTranslation } from "react-i18next";
import {
  useAccountsSuspense,
  useCategoriesSuspense,
  useTransactionsSuspense,
} from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { TimelineRow } from "@/components/timeline-row/timeline-row";
import { TransactionAmount } from "@/components/transaction-amount/transaction-amount";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { RowsSkeleton } from "@/components/ui/skeleton/skeleton";
import { UnusualAmountBadge } from "@/components/unusual-amount-badge/unusual-amount-badge";
import { recentTransactionsParams } from "@/features/dashboard/dashboard-queries";
import { DashboardSection } from "@/features/dashboard/dashboard-section/dashboard-section";
import { useShortDayIso } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { currentMonthKey } from "@/lib/calendar";
import { byId, nameById } from "@/lib/options";
import { transactionCategoryLabel, transactionName } from "@/lib/transaction-row";
import { metaLine } from "@/lib/utils";

interface Props {
  month: string;
}

function RecentRows({ month }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDay = useShortDayIso();
  const today = useTodayDate();

  const recent = useTransactionsSuspense(recentTransactionsParams(month, today));
  const categories = useCategoriesSuspense();
  const accounts = useAccountsSuspense();

  const categoryById = byId(categories.data);
  const accountNames = nameById(accounts.data);
  const recentItems = recent.data.items;

  if (recentItems.length === 0) {
    return (
      <EmptyText>
        {month === currentMonthKey(today) ? t("dashboard.empty") : t("dashboard.emptyMonth")}
      </EmptyText>
    );
  }

  return (
    <Rows>
      {recentItems.map((transaction) => (
        <TimelineRow
          key={transaction.id}
          day={formatDay(transaction.date)}
          title={transactionName(transaction, categoryById, t)}
          subtitle={metaLine(
            transaction.description ? transactionCategoryLabel(transaction, categoryById, t) : null,
            accountNames.get(transaction.accountId),
          )}
          amount={
            <span className="flex shrink-0 items-center gap-1.5">
              <UnusualAmountBadge
                transactionId={transaction.id}
                unusual={transaction.unusual}
                dismissed={transaction.unusualDismissed}
              />
              <TransactionAmount transaction={transaction} className="shrink-0" />
            </span>
          }
        />
      ))}
    </Rows>
  );
}

export function RecentTransactionsList({
  month,
  className,
}: Readonly<Props & { className?: string }>) {
  const { t } = useTranslation();

  return (
    <DashboardSection
      className={className}
      title={t("dashboard.recent")}
      to="/transactions"
      linkLabel={t("nav.transactions")}
    >
      <QueryBoundary
        fallback={<RowsSkeleton rows={6} lines={2} />}
        errorSubject={t("dashboard.recent")}
      >
        <RecentRows month={month} />
      </QueryBoundary>
    </DashboardSection>
  );
}

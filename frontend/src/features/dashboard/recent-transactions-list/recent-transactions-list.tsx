import { useTranslation } from "react-i18next";
import {
  useAccountsSuspense,
  useCategoriesSuspense,
  useTransactionsSuspense,
} from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { TimelineRow } from "@/components/timeline-row/timeline-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { RowsSkeleton } from "@/components/ui/skeleton/skeleton";
import { TextLink } from "@/components/ui/text-link/text-link";
import { recentTransactionsParams } from "@/features/dashboard/dashboard-queries";
import { DashboardSection } from "@/features/dashboard/dashboard-section/dashboard-section";
import { TransactionAmount } from "@/features/transactions/transaction-amount/transaction-amount";
import {
  transactionCategoryLabel,
  transactionName,
} from "@/features/transactions/transaction-amount/transaction-row";
import { UnusualAmountBadge } from "@/features/transactions/unusual-amount/unusual-amount-badge";
import { useShortDayIso } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { currentMonthKey } from "@/lib/calendar";
import { byId, nameById } from "@/lib/options";
import { metaLine } from "@/lib/utils";

function FirstRunSteps() {
  const { t } = useTranslation();
  const steps = [
    {
      to: "/accounts",
      label: "dashboard.firstRun.accounts",
      hint: "dashboard.firstRun.accountsHint",
    },
    {
      to: "/transactions",
      label: "dashboard.firstRun.transactions",
      hint: "dashboard.firstRun.transactionsHint",
    },
    { to: "/budgets", label: "dashboard.firstRun.budgets", hint: "dashboard.firstRun.budgetsHint" },
  ] as const;

  return (
    <div className="py-4 text-sm">
      <p className="text-muted-foreground">{t("dashboard.firstRun.intro")}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground marker:tabular-nums">
        {steps.map((step) => (
          <li key={step.to}>
            <TextLink to={step.to}>{t(step.label)}</TextLink>{" "}
            <span className="text-muted-foreground">{t(step.hint)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

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
    return accounts.data.length === 0 ? (
      <FirstRunSteps />
    ) : (
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

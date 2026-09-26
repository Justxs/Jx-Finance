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
import {
  TransactionAmount,
  transactionCategoryLabel,
  transactionName,
} from "@/features/transactions/transaction-amount";
import { useShortDayIso } from "@/hooks/use-formatters";
import { byId, nameById } from "@/lib/options";
import { metaLine } from "@/lib/utils";
import { recentTransactionsParams } from "../dashboard-queries";
import { DashboardSection } from "../dashboard-section/dashboard-section";

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

function RecentRows() {
  const { t } = useTranslation();
  const formatDay = useShortDayIso();

  const recent = useTransactionsSuspense(recentTransactionsParams);
  const categories = useCategoriesSuspense();
  const accounts = useAccountsSuspense();

  const categoryById = byId(categories.data);
  const accountNames = nameById(accounts.data);
  const recentItems = recent.data.items;

  if (recentItems.length === 0) {
    return accounts.data.length === 0 ? (
      <FirstRunSteps />
    ) : (
      <EmptyText>{t("dashboard.empty")}</EmptyText>
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
          amount={<TransactionAmount transaction={transaction} className="shrink-0" />}
        />
      ))}
    </Rows>
  );
}

export function RecentTransactionsList({ className }: Readonly<{ className?: string }>) {
  const { t } = useTranslation();

  return (
    <DashboardSection
      className={className}
      title={t("dashboard.recent")}
      to="/transactions"
      linkLabel={t("nav.transactions")}
    >
      <QueryBoundary fallback={<RowsSkeleton rows={6} />} errorSubject={t("dashboard.recent")}>
        <RecentRows />
      </QueryBoundary>
    </DashboardSection>
  );
}

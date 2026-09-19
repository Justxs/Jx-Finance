import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  useAccountsSuspense,
  useCategoriesSuspense,
  useTransactionsSuspense,
} from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary";
import { RowsSkeleton } from "@/components/ui/skeleton";
import {
  TransactionAmount,
  transactionCategoryLabel,
  transactionName,
} from "@/features/transactions/transaction-amount";
import { parseIso } from "@/lib/calendar";
import { recentTransactionsParams } from "../dashboard-queries";
import { DashboardSection } from "../dashboard-section";

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
            <Link
              to={step.to}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t(step.label)}
            </Link>{" "}
            <span className="text-muted-foreground">{t(step.hint)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RecentRows() {
  const { t, i18n } = useTranslation();
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });

  const recent = useTransactionsSuspense(recentTransactionsParams);
  const categories = useCategoriesSuspense();
  const accounts = useAccountsSuspense();

  const categoryById = new Map(categories.data.map((c) => [c.id, c]));
  const accountNames = new Map(accounts.data.map((a) => [a.id, a.name]));
  const recentItems = recent.data.items;

  function formatDay(value: string) {
    const parsed = parseIso(value);
    return parsed ? dayFormat.format(parsed) : "";
  }

  if (recentItems.length === 0) {
    return accounts.data.length === 0 ? (
      <FirstRunSteps />
    ) : (
      <p className="py-6 text-sm text-muted-foreground">{t("dashboard.empty")}</p>
    );
  }

  return (
    <ul className="rows">
      {recentItems.map((transaction) => {
        const name = transactionName(transaction, categoryById, t);
        const meta = [
          transaction.description ? transactionCategoryLabel(transaction, categoryById, t) : null,
          accountNames.get(transaction.accountId),
        ].filter(Boolean);
        return (
          <li key={transaction.id} className="flex items-baseline gap-4 py-2.5 text-sm">
            <span className="w-14 shrink-0 text-muted-foreground tabular-nums">
              {formatDay(transaction.date)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium" title={name}>
                {name}
              </p>
              <p className="truncate text-xs text-muted-foreground" title={meta.join(" · ")}>
                {meta.join(" · ")}
              </p>
            </div>
            <TransactionAmount transaction={transaction} className="shrink-0" />
          </li>
        );
      })}
    </ul>
  );
}

export function RecentTransactionsList() {
  const { t } = useTranslation();

  return (
    <DashboardSection
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

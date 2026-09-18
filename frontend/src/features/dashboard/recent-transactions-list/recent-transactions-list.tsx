import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  useGetAccountsEndpointSuspense,
  useGetCategoriesEndpointSuspense,
  useGetTransactionsEndpointSuspense,
} from "@/api/generated";
import {
  TransactionAmount,
  transactionCategoryLabel,
  transactionName,
} from "@/features/transactions/transaction-amount";
import { parseIso } from "@/lib/calendar";

export function RecentTransactionsList() {
  const { t, i18n } = useTranslation();
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });

  const recent = useGetTransactionsEndpointSuspense({ page: 1, pageSize: 6 });
  const categories = useGetCategoriesEndpointSuspense();
  const accounts = useGetAccountsEndpointSuspense();

  const categoryById = new Map(categories.data.map((c) => [c.id, c]));
  const accountNames = new Map(accounts.data.map((a) => [a.id, a.name]));
  const recentItems = recent.data.items;

  function formatDay(value: string) {
    const parsed = parseIso(value);
    return parsed ? dayFormat.format(parsed) : "";
  }

  let content: ReactNode;
  if (recentItems.length === 0) {
    content = <p className="py-6 text-sm text-muted-foreground">{t("dashboard.empty")}</p>;
  } else {
    content = (
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
              <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-3">
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

  return (
    <section className="section">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-title">{t("dashboard.recent")}</h2>
        <Link
          to="/transactions"
          className="-my-1 inline-flex items-center gap-1 py-1 text-sm font-medium text-primary hover:underline"
        >
          {t("nav.transactions")}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      {content}
    </section>
  );
}

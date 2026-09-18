import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  useGetAccountsEndpointSuspense,
  useGetCategoriesEndpointSuspense,
  useGetTransactionsEndpointSuspense,
} from "@/api/generated";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { CategoryIcon } from "@/lib/category-icons";

export function RecentTransactionsList() {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();

  const recent = useGetTransactionsEndpointSuspense({ page: 1, pageSize: 6 });
  const categories = useGetCategoriesEndpointSuspense();
  const accounts = useGetAccountsEndpointSuspense();

  const categoryById = new Map(categories.data?.map((c) => [c.id, c]) ?? []);
  const accountNames = new Map(accounts.data?.map((a) => [a.id, a.name]) ?? []);
  const recentItems = recent.data?.items ?? [];

  let content: ReactNode;
  if (recentItems.length === 0) {
    content = <p className="px-6 py-8 text-sm text-muted-foreground">{t("dashboard.empty")}</p>;
  } else {
    content = (
      <ul className="divide-y divide-border px-6">
        {recentItems.map((transaction) => {
          const category = categoryById.get(transaction.categoryId ?? "");
          return (
            <li key={transaction.id} className="flex items-center gap-4 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CategoryIcon icon={category?.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {transaction.description || category?.name || t("transactions.uncategorized")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(transaction.date)}
                  {" · "}
                  {accountNames.get(transaction.accountId) ?? ""}
                </p>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  transaction.type === "income" ? "text-secondary" : "text-foreground"
                }`}
              >
                {transaction.type === "income" ? "+" : "−"}
                {money.format(Number(transaction.amount))}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-6 py-4">
        <h2 className="font-semibold">{t("dashboard.recent")}</h2>
        <Link to="/transactions" className="text-sm font-medium text-primary hover:underline">
          {t("nav.transactions")} →
        </Link>
      </div>
      {content}
    </section>
  );
}

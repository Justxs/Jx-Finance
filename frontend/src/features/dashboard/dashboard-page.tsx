import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useGetAccountsEndpoint,
  useGetCategoriesEndpoint,
  useGetDashboardSummaryEndpoint,
  useGetTransactionsEndpoint,
} from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useDate, useMoney } from "@/hooks/use-formatters";
import { CategoryIcon } from "@/lib/category-icons";

export function DashboardPage() {
  const { t } = useTranslation();
  const money = useMoney();
  const date = useDate();

  const summary = useGetDashboardSummaryEndpoint();
  const recent = useGetTransactionsEndpoint({ page: 1, pageSize: 6 });
  const categories = useGetCategoriesEndpoint();
  const accounts = useGetAccountsEndpoint();

  const categoryById = new Map(categories.data?.map((c) => [c.id, c]) ?? []);
  const accountNames = new Map(accounts.data?.map((a) => [a.id, a.name]) ?? []);
  const recentItems = recent.data?.items ?? [];

  const stats = [
    {
      key: "dashboard.totalBalance",
      value: summary.data?.totalBalance,
      icon: Wallet,
      chip: "bg-primary/10 text-primary",
      tone: "text-foreground",
    },
    {
      key: "dashboard.monthIncome",
      value: summary.data?.monthIncome,
      icon: TrendingUp,
      chip: "bg-secondary/15 text-secondary",
      tone: "text-secondary",
    },
    {
      key: "dashboard.monthExpense",
      value: summary.data?.monthExpense,
      icon: TrendingDown,
      chip: "bg-destructive/10 text-destructive",
      tone: "text-destructive",
    },
  ] as const;

  let recentContent: ReactNode;
  if (recent.isPending) {
    recentContent = (
      <ul className="divide-y divide-border px-6">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="flex items-center gap-4 py-3.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-4 w-16" />
          </li>
        ))}
      </ul>
    );
  } else if (recentItems.length === 0) {
    recentContent = (
      <p className="px-6 py-8 text-sm text-muted-foreground">{t("dashboard.empty")}</p>
    );
  } else {
    recentContent = (
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
                  {transaction.date ? date.format(new Date(transaction.date)) : ""}
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
    <div className="space-y-8">
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.key} className="card flex items-start justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t(stat.key)}</p>
              {summary.isPending ? (
                <Skeleton className="mt-3 h-8 w-32" />
              ) : (
                <p
                  className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${stat.tone}`}
                >
                  {stat.value === undefined ? "—" : money.format(Number(stat.value))}
                </p>
              )}
            </div>
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${stat.chip}`}
            >
              <stat.icon className="size-5" />
            </span>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold">{t("dashboard.recent")}</h2>
          <Link to="/transactions" className="text-sm font-medium text-primary hover:underline">
            {t("nav.transactions")} →
          </Link>
        </div>
        {recentContent}
      </section>
    </div>
  );
}

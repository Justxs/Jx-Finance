import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { CategoryBreakdownItem } from "@/api/generated/model";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Meter } from "@/components/ui/meter/meter";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { CategoryIcon } from "@/lib/category-icons";
import { changeOf } from "@/lib/comparison";

const MAX_ROWS = 5;

interface Props {
  items: CategoryBreakdownItem[];
  type?: "expense" | "income";
  dateFrom?: string;
  dateTo?: string;
}

function weightOf(item: CategoryBreakdownItem) {
  return item.comparisonAmount == null
    ? Number(item.amount)
    : Math.max(Number(item.amount), Number(item.comparisonAmount));
}

export function CategoryBreakdown({ items, type = "expense", dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();

  const compared = items.some((item) => item.comparisonAmount != null);
  const sorted = items.toSorted((a, b) => weightOf(b) - weightOf(a));
  const rest = sorted.slice(MAX_ROWS);
  const restTotal = rest.reduce((sum, item) => sum + Number(item.amount), 0);
  const restEarlier = rest.reduce((sum, item) => sum + Number(item.comparisonAmount ?? 0), 0);

  function nameOf(item: CategoryBreakdownItem) {
    if (item.syntheticGroup) {
      return t(`reports.syntheticGroups.${item.syntheticGroup}`);
    }
    return item.categoryName ?? t("transactions.uncategorized");
  }

  const rows = [
    ...sorted.slice(0, MAX_ROWS).map((item) => ({
      key: item.categoryId ?? item.syntheticGroup ?? "uncategorized",
      name: nameOf(item),
      amount: Number(item.amount),
      earlier: compared ? Number(item.comparisonAmount ?? 0) : null,
      categoryId: item.syntheticGroup ? null : item.categoryId,
      icon: item.categoryIcon,
    })),
    ...(restTotal > 0 || restEarlier > 0
      ? [
          {
            key: "other",
            name: t("dashboard.other"),
            amount: restTotal,
            earlier: compared ? restEarlier : null,
            categoryId: null,
            icon: "shapes",
          },
        ]
      : []),
  ];

  if (rows.length === 0) {
    return (
      <EmptyText>{type === "income" ? t("reports.noIncome") : t("dashboard.noSpending")}</EmptyText>
    );
  }

  const maximum = Math.max(...rows.map((row) => row.amount));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline gap-3 text-sm">
            <CategoryIcon
              icon={row.icon}
              className="shrink-0 translate-y-0.5 self-start text-muted-foreground"
            />
            {row.categoryId ? (
              <Tooltip content={t("dashboard.showTransactions", { category: row.name })}>
                <Link
                  to="/transactions"
                  search={{
                    page: 1,
                    categoryId: row.categoryId,
                    type,
                    dateFrom,
                    dateTo,
                  }}
                  className="min-w-0 flex-1 wrap-break-word underline-offset-4 hover:underline"
                >
                  {row.name}
                </Link>
              </Tooltip>
            ) : (
              <span className="min-w-0 flex-1 wrap-break-word">{row.name}</span>
            )}
            <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {percent.format(total > 0 ? row.amount / total : 0)}
            </span>
            <span className="w-24 shrink-0 text-right font-medium tabular-nums">
              {money.format(row.amount)}
            </span>
          </div>
          <Meter value={row.amount} max={maximum} className="mt-1.5" />
          {row.earlier === null ? null : (
            <div className="mt-1 flex items-baseline justify-end gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("reports.comparison.was", { amount: money.format(row.earlier) })}
              </span>
              <ChangeBadge
                change={changeOf(row.amount, row.earlier)}
                good={type === "income" ? "up" : "down"}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

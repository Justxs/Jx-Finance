import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { CategoryBreakdownItem } from "@/api/generated/model";
import { Meter } from "@/components/ui/meter";
import { Tooltip } from "@/components/ui/tooltip";
import { useMoney, usePercent } from "@/hooks/use-formatters";

const MAX_ROWS = 5;

interface Props {
  items: CategoryBreakdownItem[];
  dateFrom?: string;
  dateTo?: string;
}

export function CategoryBreakdown({ items, dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();

  const sorted = items.toSorted((a, b) => Number(b.amount) - Number(a.amount));
  const restTotal = sorted.slice(MAX_ROWS).reduce((sum, item) => sum + Number(item.amount), 0);

  const rows = [
    ...sorted.slice(0, MAX_ROWS).map((item) => ({
      name: item.categoryName ?? t("transactions.uncategorized"),
      amount: Number(item.amount),
      categoryId: item.categoryId,
    })),
    ...(restTotal > 0 ? [{ name: t("dashboard.other"), amount: restTotal, categoryId: null }] : []),
  ];

  if (rows.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">{t("dashboard.noSpending")}</p>;
  }

  const maximum = Math.max(...rows.map((row) => row.amount));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <li key={row.categoryId ?? "other"}>
          <div className="flex items-baseline gap-3 text-sm">
            {row.categoryId ? (
              <Tooltip content={t("dashboard.showTransactions", { category: row.name })}>
                <Link
                  to="/transactions"
                  search={{
                    page: 1,
                    categoryId: row.categoryId,
                    type: "expense",
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
        </li>
      ))}
    </ul>
  );
}

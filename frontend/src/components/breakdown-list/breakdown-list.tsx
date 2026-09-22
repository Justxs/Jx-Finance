import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { CategoryIcon } from "@/lib/category-icons";
import { changeOf } from "@/lib/comparison";
import { cn } from "@/lib/utils";
import { ShareRow } from "./share-row";

export interface BreakdownRow {
  key: string;
  name: string;
  amount: number;
  earlier: number | null;
  filter?: { categoryId?: string; tagIds?: string };
  icon?: string | null;
  muted?: boolean;
}

interface Props {
  rows: readonly BreakdownRow[];
  type?: "expense" | "income";
  dateFrom?: string;
  dateTo?: string;
}

export function breakdownWeight(
  item: Readonly<{ amount: string; comparisonAmount?: string | null }>,
) {
  return item.comparisonAmount == null
    ? Number(item.amount)
    : Math.max(Number(item.amount), Number(item.comparisonAmount));
}

export function BreakdownList({ rows, type = "expense", dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();

  const maximum = Math.max(...rows.map((row) => row.amount));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <ShareRow
          key={row.key}
          icon={
            row.icon === undefined ? null : (
              <CategoryIcon
                icon={row.icon}
                className="shrink-0 translate-y-0.5 self-start text-muted-foreground"
              />
            )
          }
          name={
            row.filter ? (
              <Tooltip content={t("dashboard.showTransactions", { category: row.name })}>
                <Link
                  to="/transactions"
                  search={{ page: 1, ...row.filter, type, dateFrom, dateTo }}
                  className="min-w-0 flex-1 wrap-break-word underline-offset-4 hover:underline"
                >
                  {row.name}
                </Link>
              </Tooltip>
            ) : (
              <span
                className={cn(
                  "min-w-0 flex-1 wrap-break-word",
                  row.muted && "text-muted-foreground",
                )}
              >
                {row.name}
              </span>
            )
          }
          share={percent.format(total > 0 ? row.amount / total : 0)}
          amount={money.format(row.amount)}
          value={row.amount}
          max={maximum}
        >
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
        </ShareRow>
      ))}
    </ul>
  );
}
